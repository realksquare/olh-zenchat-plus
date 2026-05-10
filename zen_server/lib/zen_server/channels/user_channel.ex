defmodule ZenServer.UserChannel do
  use Phoenix.Channel
  require Logger

  alias ZenServer.{Repo, Presence, Firebase}
  alias ZenServer.Schema.{User, Chat, ChatParticipant, Message}
  import Ecto.Query

  @impl true
  def join("user:" <> user_id, _payload, socket) do
    if socket.assigns.user_id == user_id do
      send(self(), :after_join)
      {:ok, socket}
    else
      {:error, %{reason: "unauthorized"}}
    end
  end

  @impl true
  def handle_info(:after_join, socket) do
    user_id = socket.assigns.user_id
    device_type = socket.assigns.device_type

    Presence.cancel_disconnect_timer(user_id)
    Presence.user_connected(user_id, socket.id, device_type)

    user = Repo.get(User, user_id)
    if user do
      Repo.update!(Ecto.Changeset.change(user, %{is_online: true}))
      broadcast_user_status(user_id, true, nil)
      push_online_contacts(user_id, socket)
      deliver_pending_messages(user_id, socket)
    end

    {:noreply, socket}
  end

  @impl true
  def terminate(_reason, socket) do
    user_id = socket.assigns.user_id
    Presence.user_disconnected(user_id, socket.id)

    unless Presence.online?(user_id) do
      Process.send_after(self(), {:go_offline, user_id}, 30_000)
    end
    {:ok, socket}
  end

  def handle_info({:go_offline, user_id}, socket) do
    unless Presence.online?(user_id) do
      now = DateTime.utc_now()
      user = Repo.get(User, user_id)
      if user do
        Repo.update!(Ecto.Changeset.change(user, %{is_online: false, last_seen: now}))
        broadcast_user_status(user_id, false, now)
      end
    end
    {:noreply, socket}
  end

  @impl true
  def handle_in("send_message", payload, socket) do
    user_id = socket.assigns.user_id
    %{"chatId" => chat_id, "content" => content} = payload

    attrs = %{
      content: content || "",
      type: Map.get(payload, "type", "text"),
      media_url: Map.get(payload, "mediaUrl", ""),
      reply_to_id: Map.get(payload, "replyTo"),
      is_view_once: Map.get(payload, "isViewOnce", false),
      chat_id: chat_id,
      sender_id: user_id,
      is_delivered: false,
      is_read: false
    }

    {:ok, msg} = Repo.insert(Message.changeset(%Message{}, attrs))
    msg = Repo.preload(msg, :sender)

    chat = Repo.get!(Chat, chat_id) |> Repo.preload(:participants)
    Repo.update!(Ecto.Changeset.change(chat, %{last_message_id: msg.id}))

    serialized = Message.serialize(msg, msg.sender)

    participants = Enum.map(chat.participants, & &1.user_id)

    Enum.each(participants, fn p_id ->
      sockets = Presence.get_sockets(p_id)
      if map_size(sockets) > 0 do
        Enum.each(sockets, fn {sock_id, _dtype} ->
          ZenServer.Endpoint.broadcast("user:#{p_id}", "receive_message", %{message: serialized})
          _ = sock_id
        end)
      else
        Task.start(fn -> send_push_notification(p_id, serialized, chat_id) end)
      end
    end)

    {:noreply, socket}
  end

  def handle_in("edit_message", %{"chatId" => chat_id, "messageId" => message_id, "newContent" => new_content}, socket) do
    user_id = socket.assigns.user_id
    msg = Repo.get(Message, message_id)

    if msg && msg.sender_id == user_id do
      {:ok, updated} = Repo.update(Ecto.Changeset.change(msg, %{content: String.trim(new_content), is_edited: true}))
      updated = Repo.preload(updated, :sender)
      broadcast_to_chat(chat_id, user_id, "message_edited", %{message: Message.serialize(updated, updated.sender)})
    end
    {:noreply, socket}
  end

  def handle_in("delete_message", %{"chatId" => chat_id, "messageId" => message_id, "deleteFor" => delete_for}, socket) do
    user_id = socket.assigns.user_id
    msg = Repo.get(Message, message_id)

    if msg && msg.sender_id == user_id do
      if delete_for == "everyone" do
        Repo.update!(Ecto.Changeset.change(msg, %{is_deleted: true, content: "This message was deleted"}))
        broadcast_to_chat_and_offline(chat_id, user_id, "message_deleted", %{
          messageId: message_id,
          chatId: chat_id,
          deleteFor: "everyone"
        })
      else
        Repo.delete!(msg)
        push(socket, "message_deleted", %{messageId: message_id, chatId: chat_id, deleteFor: "self"})
      end
    end
    {:noreply, socket}
  end

  def handle_in("typing_start", %{"chatId" => chat_id} = payload, socket) do
    user_id = socket.assigns.user_id
    scramble = Map.get(payload, "scramble")
    broadcast_to_chat_others(chat_id, user_id, "typing_status", %{
      userId: user_id,
      chatId: chat_id,
      isTyping: true,
      scramble: scramble
    })
    {:noreply, socket}
  end

  def handle_in("typing_stop", %{"chatId" => chat_id}, socket) do
    user_id = socket.assigns.user_id
    broadcast_to_chat_others(chat_id, user_id, "typing_status", %{
      userId: user_id,
      chatId: chat_id,
      isTyping: false
    })
    {:noreply, socket}
  end

  def handle_in("message_read", %{"chatId" => chat_id}, socket) do
    user_id = socket.assigns.user_id

    from(m in Message, where: m.chat_id == ^chat_id and m.sender_id != ^user_id and m.is_read == false)
    |> Repo.update_all(set: [is_read: true])

    broadcast_to_chat_others(chat_id, user_id, "messages_read", %{
      chatId: chat_id,
      readBy: user_id
    })
    {:noreply, socket}
  end

  defp broadcast_to_chat(chat_id, sender_id, event, payload) do
    participants = from(cp in ChatParticipant, where: cp.chat_id == ^chat_id, select: cp.user_id) |> Repo.all()
    Enum.each(participants, fn p_id ->
      sockets = Presence.get_sockets(p_id)
      Enum.each(sockets, fn {_sid, _dt} ->
        if p_id != sender_id do
          ZenServer.Endpoint.broadcast("user:#{p_id}", event, payload)
        end
      end)
    end)
    my_sockets = Presence.get_sockets(sender_id)
    Enum.each(my_sockets, fn {_sid, _dt} ->
      ZenServer.Endpoint.broadcast("user:#{sender_id}", event, payload)
    end)
  end

  defp broadcast_to_chat_others(chat_id, sender_id, event, payload) do
    participants = from(cp in ChatParticipant, where: cp.chat_id == ^chat_id, select: cp.user_id) |> Repo.all()
    Enum.each(participants, fn p_id ->
      if p_id != sender_id do
        sockets = Presence.get_sockets(p_id)
        Enum.each(sockets, fn {_sid, _dt} ->
          ZenServer.Endpoint.broadcast("user:#{p_id}", event, payload)
        end)
      end
    end)
  end

  defp broadcast_to_chat_and_offline(chat_id, _sender_id, event, payload) do
    participants = from(cp in ChatParticipant, where: cp.chat_id == ^chat_id, select: cp.user_id) |> Repo.all()
    Enum.each(participants, fn p_id ->
      ZenServer.Endpoint.broadcast("user:#{p_id}", event, payload)
    end)
  end

  defp broadcast_user_status(user_id, is_online, last_seen) do
    user = Repo.get(User, user_id)
    if user do
      Enum.each(Presence.all_online(), fn online_id ->
        if online_id != user_id do
          event = if is_online, do: "user_online", else: "user_offline"
          payload = if is_online, do: %{userId: user_id}, else: %{userId: user_id, lastSeen: last_seen}
          ZenServer.Endpoint.broadcast("user:#{online_id}", event, payload)
        end
      end)
    end
  end

  defp push_online_contacts(_user_id, _socket) do
    # Simplified
  end

  defp deliver_pending_messages(user_id, socket) do
    chat_ids = from(cp in ChatParticipant, where: cp.user_id == ^user_id, select: cp.chat_id) |> Repo.all()

    pending = from(m in Message,
      where: m.chat_id in ^chat_ids and m.sender_id != ^user_id and m.is_delivered == false,
      preload: [:sender]
    ) |> Repo.all()

    if length(pending) > 0 do
      msg_ids = Enum.map(pending, & &1.id)
      from(m in Message, where: m.id in ^msg_ids) |> Repo.update_all(set: [is_delivered: true])

      Enum.each(pending, fn msg ->
        push(socket, "receive_message", %{message: Message.serialize(msg, msg.sender)})
      end)
    end
  end

  defp send_push_notification(recipient_id, message, chat_id) do
    recipient = Repo.get(User, recipient_id)
    if recipient && recipient.notifications_enabled && length(recipient.fcm_tokens) > 0 do
      sender_name = get_in(message, ["sender", "username"]) || "Someone"
      body = case message["type"] do
        "image" -> "#{sender_name} sent a photo"
        "video" -> "#{sender_name} sent a video"
        "voice" -> "#{sender_name} sent a voice message"
        _ -> "#{sender_name}: #{String.slice(message["content"] || "", 0, 100)}"
      end
      Enum.each(recipient.fcm_tokens, fn token ->
        Firebase.send_push(recipient_id, token, "ZenChat+", body, %{
          chatId: chat_id,
          messageId: message["id"] || ""
        })
      end)
    end
  end
end
