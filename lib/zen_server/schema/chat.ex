defmodule ZenServer.Schema.Chat do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "chats" do
    field :is_group, :boolean, default: false
    field :group_name, :string
    field :group_avatar, :string
    has_many :participants, ZenServer.Schema.ChatParticipant
    has_many :messages, ZenServer.Schema.Message
    belongs_to :last_message, ZenServer.Schema.Message,
      foreign_key: :last_message_id, define_field: true
    timestamps()
  end

  def changeset(chat, params) do
    chat
    |> cast(params, [:is_group, :group_name, :group_avatar, :last_message_id])
  end
end

defmodule ZenServer.Schema.ChatParticipant do
  use Ecto.Schema

  @primary_key false
  @foreign_key_type :binary_id

  schema "chat_participants" do
    belongs_to :chat, ZenServer.Schema.Chat
    belongs_to :user, ZenServer.Schema.User
    field :is_pinned, :boolean, default: false
  end
end
