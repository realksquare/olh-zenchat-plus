defmodule ZenServer.Schema.Message do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "messages" do
    field :content, :string
    field :type, :string, default: "text"
    field :is_read, :boolean, default: false
    field :is_delivered, :boolean, default: false
    field :is_deleted, :boolean, default: false
    field :is_starred, :boolean, default: false
    field :is_edited, :boolean, default: false
    field :is_view_once, :boolean, default: false
    field :media_url, :string
    belongs_to :chat, ZenServer.Schema.Chat
    belongs_to :sender, ZenServer.Schema.User, foreign_key: :sender_id
    belongs_to :reply_to, ZenServer.Schema.Message, foreign_key: :reply_to_id
    timestamps()
  end

  def changeset(msg, params) do
    msg
    |> cast(params, [:content, :type, :media_url, :is_view_once, :chat_id, :sender_id, :reply_to_id])
    |> validate_required([:chat_id, :sender_id])
  end

  def serialize(msg, sender \\ nil) do
    %{
      "id" => msg.id,
      "content" => msg.content,
      "type" => msg.type || "text",
      "mediaUrl" => msg.media_url,
      "isRead" => msg.is_read,
      "isDelivered" => msg.is_delivered,
      "isDeleted" => msg.is_deleted,
      "isStarred" => msg.is_starred,
      "isEdited" => msg.is_edited,
      "isViewOnce" => msg.is_view_once,
      "chatId" => msg.chat_id,
      "senderId" => msg.sender_id,
      "sender" => if(sender, do: ZenServer.Schema.User.public_fields(sender), else: nil),
      "replyToId" => msg.reply_to_id,
      "createdAt" => msg.inserted_at
    }
  end
end
