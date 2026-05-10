defmodule ZenServer.Repo.Migrations.CreateTables do
  use Ecto.Migration

  def change do
    execute "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"", ""

    create table(:users, primary_key: false) do
      add :id, :binary_id, primary_key: true, default: fragment("uuid_generate_v4()")
      add :email, :string, null: false
      add :username, :string
      add :password_hash, :string, null: false
      add :full_name, :string, default: ""
      add :avatar, :string, default: ""
      add :is_online, :boolean, default: false
      add :last_seen, :utc_datetime
      add :role, :string, default: "user"
      add :is_verified, :boolean, default: false
      add :is_suspended, :boolean, default: false
      add :notifications_enabled, :boolean, default: true
      add :privacy_settings, :map, default: %{}
      add :fcm_tokens, {:array, :string}, default: []
      timestamps()
    end

    create unique_index(:users, [:email])
    create unique_index(:users, [:username])

    create table(:chats, primary_key: false) do
      add :id, :binary_id, primary_key: true, default: fragment("uuid_generate_v4()")
      add :is_group, :boolean, default: false
      add :group_name, :string
      add :group_avatar, :string
      add :last_message_id, :binary_id
      timestamps()
    end

    create table(:chat_participants, primary_key: false) do
      add :chat_id, references(:chats, type: :binary_id, on_delete: :delete_all), null: false
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :is_pinned, :boolean, default: false
    end

    create unique_index(:chat_participants, [:chat_id, :user_id])

    create table(:messages, primary_key: false) do
      add :id, :binary_id, primary_key: true, default: fragment("uuid_generate_v4()")
      add :content, :text
      add :type, :string, default: "text"
      add :is_read, :boolean, default: false
      add :is_delivered, :boolean, default: false
      add :is_deleted, :boolean, default: false
      add :is_starred, :boolean, default: false
      add :is_view_once, :boolean, default: false
      add :media_url, :string
      add :chat_id, references(:chats, type: :binary_id, on_delete: :delete_all), null: false
      add :sender_id, references(:users, type: :binary_id, on_delete: :nilify_all)
      add :reply_to_id, :binary_id
      timestamps()
    end

    create index(:messages, [:chat_id])
    create index(:messages, [:sender_id])

    create table(:moments, primary_key: false) do
      add :id, :binary_id, primary_key: true, default: fragment("uuid_generate_v4()")
      add :media_url, :string
      add :media_type, :string, default: "image"
      add :caption, :string
      add :expires_at, :utc_datetime
      add :song_data, :map, default: %{}
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      timestamps()
    end

    create table(:moment_views, primary_key: false) do
      add :moment_id, references(:moments, type: :binary_id, on_delete: :delete_all), null: false
      add :viewer_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :viewed_at, :utc_datetime
    end

    create unique_index(:moment_views, [:moment_id, :viewer_id])
  end
end
