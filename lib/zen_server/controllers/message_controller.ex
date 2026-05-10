defmodule ZenServer.MessageController do
  import Plug.Conn
  use Phoenix.Controller
  import Ecto.Query

  alias ZenServer.Repo
  alias ZenServer.Schema.{Chat, ChatParticipant, Message, User}

  def index(conn, %{"chat_id" => chat_id} = params) do
    user_id = conn.assigns.current_user_id
    limit = String.to_integer(Map.get(params, "limit", "50"))
    before_id = Map.get(params, "before")

    query =
      from(m in Message,
        where: m.chat_id == ^chat_id and m.is_deleted == false,
        order_by: [desc: m.inserted_at],
        limit: ^limit,
        preload: [:sender]
      )

    query = if before_id do
      msg = Repo.get!(Message, before_id)
      from(m in query, where: m.inserted_at < ^msg.inserted_at)
    else
      query
    end

    messages = Repo.all(query) |> Enum.reverse()

    # Mark unread as read
    from(m in Message,
      where: m.chat_id == ^chat_id and m.sender_id != ^user_id and m.is_read == false)
    |> Repo.update_all(set: [is_read: true])

    serialized = Enum.map(messages, &Message.serialize(&1, &1.sender))
    json(conn, %{messages: serialized})
  end

  def create(conn, params) do
    user_id = conn.assigns.current_user_id
    chat_id = params["chat_id"] || params["chatId"]

    attrs = %{
      content: params["content"],
      type: params["type"] || "text",
      media_url: params["mediaUrl"],
      is_view_once: params["isViewOnce"] || false,
      reply_to_id: params["replyToId"],
      chat_id: chat_id,
      sender_id: user_id
    }

    case Repo.insert(Message.changeset(%Message{}, attrs)) do
      {:ok, msg} ->
        from(c in Chat, where: c.id == ^chat_id)
        |> Repo.update_all(set: [last_message_id: msg.id])

        sender = Repo.get!(User, user_id)
        serialized = Message.serialize(msg, sender)

        # Broadcast to channel
        ZenServer.Endpoint.broadcast("chat:#{chat_id}", "new_message", serialized)

        conn |> put_status(201) |> json(%{message: serialized})

      {:error, _} ->
        conn |> put_status(400) |> json(%{message: "Failed to send message"})
    end
  end

  def mark_read(conn, %{"chat_id" => chat_id}) do
    user_id = conn.assigns.current_user_id
    from(m in Message,
      where: m.chat_id == ^chat_id and m.sender_id != ^user_id and m.is_read == false)
    |> Repo.update_all(set: [is_read: true])
    json(conn, %{message: "Marked as read"})
  end

  def star(conn, %{"id" => id}), do: toggle_field(conn, id, :is_starred, true)
  def unstar(conn, %{"id" => id}), do: toggle_field(conn, id, :is_starred, false)

  def delete(conn, %{"id" => id}) do
    msg = Repo.get!(Message, id)
    Repo.update!(Message.changeset(msg, %{is_deleted: true, content: "This message was deleted"}))
    json(conn, %{message: "Deleted"})
  end

  def delivered(conn, %{"id" => id}) do
    toggle_field(conn, id, :is_delivered, true)
  end

  defp toggle_field(conn, id, field, value) do
    msg = Repo.get!(Message, id)
    Repo.update!(Ecto.Changeset.change(msg, [{field, value}]))
    json(conn, %{message: "Updated"})
  end
end
