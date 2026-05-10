defmodule ZenServer.ChatController do
  import Plug.Conn
  use Phoenix.Controller
  import Ecto.Query

  alias ZenServer.Repo
  alias ZenServer.Schema.{Chat, ChatParticipant, Message, User}

  def index(conn, _params) do
    user_id = conn.assigns.current_user_id

    chat_ids =
      from(cp in ChatParticipant, where: cp.user_id == ^user_id, select: cp.chat_id)
      |> Repo.all()

    chats =
      from(c in Chat, where: c.id in ^chat_ids)
      |> Repo.all()

    serialized = Enum.map(chats, &serialize_chat(&1, user_id))
    json(conn, %{chats: serialized})
  end

  def create(conn, %{"participantId" => participant_id}) do
    user_id = conn.assigns.current_user_id

    existing =
      from(cp1 in ChatParticipant,
        join: cp2 in ChatParticipant, on: cp1.chat_id == cp2.chat_id,
        join: c in Chat, on: c.id == cp1.chat_id,
        where: cp1.user_id == ^user_id and cp2.user_id == ^participant_id and c.is_group == false,
        select: c,
        limit: 1
      )
      |> Repo.one()

    if existing do
      json(conn, %{chat: serialize_chat(existing, user_id)})
    else
      {:ok, chat} = Repo.transaction(fn ->
        chat = Repo.insert!(%Chat{is_group: false})
        Repo.insert!(%ChatParticipant{chat_id: chat.id, user_id: user_id})
        Repo.insert!(%ChatParticipant{chat_id: chat.id, user_id: participant_id})
        chat
      end)
      conn |> put_status(201) |> json(%{chat: serialize_chat(chat, user_id)})
    end
  end

  def show(conn, %{"chat_id" => chat_id}) do
    user_id = conn.assigns.current_user_id
    chat = Repo.get!(Chat, chat_id)
    json(conn, %{chat: serialize_chat(chat, user_id)})
  end

  def delete(conn, %{"chat_id" => chat_id}) do
    user_id = conn.assigns.current_user_id
    chat = Repo.get!(Chat, chat_id)

    from(cp in ChatParticipant,
      where: cp.chat_id == ^chat_id and cp.user_id == ^user_id)
    |> Repo.delete_all()

    remaining = Repo.aggregate(from(cp in ChatParticipant, where: cp.chat_id == ^chat_id), :count)

    if remaining == 0 do
      from(m in Message, where: m.chat_id == ^chat_id) |> Repo.delete_all()
      Repo.delete!(chat)
    end

    json(conn, %{message: "Chat deleted"})
  end

  def search_users(conn, %{"q" => q}) do
    term = "%#{q}%"
    users =
      from(u in User,
        where: ilike(u.username, ^term) or ilike(u.email, ^term),
        limit: 20
      )
      |> Repo.all()
      |> Enum.map(&User.public_fields/1)
    json(conn, %{users: users})
  end

  def search_users(conn, _), do: json(conn, %{users: []})

  def pin(conn, %{"chat_id" => chat_id}) do
    user_id = conn.assigns.current_user_id
    from(cp in ChatParticipant,
      where: cp.chat_id == ^chat_id and cp.user_id == ^user_id)
    |> Repo.update_all(set: [is_pinned: true])
    json(conn, %{message: "Pinned"})
  end

  def unpin(conn, %{"chat_id" => chat_id}) do
    user_id = conn.assigns.current_user_id
    from(cp in ChatParticipant,
      where: cp.chat_id == ^chat_id and cp.user_id == ^user_id)
    |> Repo.update_all(set: [is_pinned: false])
    json(conn, %{message: "Unpinned"})
  end

  defp serialize_chat(chat, user_id) do
    last_msg =
      if chat.last_message_id do
        Repo.get(Message, chat.last_message_id)
      end

    other_participants =
      from(cp in ChatParticipant,
        join: u in User, on: u.id == cp.user_id,
        where: cp.chat_id == ^chat.id and cp.user_id != ^user_id,
        select: u
      )
      |> Repo.all()
      |> Enum.map(&User.public_fields/1)

    is_pinned =
      from(cp in ChatParticipant,
        where: cp.chat_id == ^chat.id and cp.user_id == ^user_id,
        select: cp.is_pinned
      )
      |> Repo.one() || false

    unread =
      from(m in Message,
        where: m.chat_id == ^chat.id and m.sender_id != ^user_id and m.is_read == false
      )
      |> Repo.aggregate(:count)

    %{
      "id" => chat.id,
      "isGroup" => chat.is_group,
      "groupName" => chat.group_name,
      "participants" => other_participants,
      "lastMessage" => if(last_msg, do: Message.serialize(last_msg), else: nil),
      "isPinned" => is_pinned,
      "unreadCount" => unread,
      "updatedAt" => chat.updated_at
    }
  end
end
