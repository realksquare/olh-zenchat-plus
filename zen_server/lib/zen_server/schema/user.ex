defmodule ZenServer.Schema.User do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "users" do
    field :email, :string
    field :username, :string
    field :password, :string, virtual: true
    field :password_hash, :string
    field :full_name, :string, default: ""
    field :avatar, :string, default: ""
    field :is_online, :boolean, default: false
    field :last_seen, :utc_datetime
    field :role, :string, default: "user"
    field :is_verified, :boolean, default: false
    field :is_suspended, :boolean, default: false
    field :notifications_enabled, :boolean, default: true
    field :privacy_settings, :map, default: %{}
    field :fcm_tokens, {:array, :string}, default: []
    timestamps()
  end

  def registration_changeset(user, params) do
    user
    |> cast(params, [:email, :password])
    |> validate_required([:email, :password])
    |> validate_format(:email, ~r/^[^\s]+@[^\s]+$/, message: "must be a valid email")
    |> validate_length(:password, min: 6, message: "must be at least 6 characters")
    |> update_change(:email, &String.downcase/1)
    |> unique_constraint(:email)
    |> unique_constraint(:username)
    |> put_auto_username()
    |> put_password_hash()
  end

  def update_changeset(user, params) do
    user
    |> cast(params, [:username, :full_name, :avatar, :notifications_enabled, :privacy_settings, :fcm_tokens, :is_online, :last_seen])
    |> unique_constraint(:username)
  end

  def fcm_changeset(user, tokens) do
    change(user, fcm_tokens: tokens)
  end

  def put_new_password(changeset, password) when is_binary(password) and password != "" do
    changeset
    |> validate_length(:password, min: 6, message: "must be at least 6 characters")
    |> put_change(:password_hash, Pbkdf2.hash_pwd_salt(password))
  end
  def put_new_password(changeset, _), do: changeset

  defp put_auto_username(changeset) do
    if get_change(changeset, :username) do
      changeset
    else
      email = get_change(changeset, :email) || ""
      base = email |> String.split("@") |> hd() |> String.replace(~r/[^a-zA-Z0-9]/, "")
      suffix = :crypto.strong_rand_bytes(3) |> Base.encode16(case: :lower)
      put_change(changeset, :username, "#{base}_#{suffix}")
    end
  end

  defp put_password_hash(changeset) do
    case get_change(changeset, :password) do
      nil -> changeset
      pw -> put_change(changeset, :password_hash, Pbkdf2.hash_pwd_salt(pw))
    end
  end

  def public_fields(user) do
    %{
      "id" => user.id,
      "username" => user.username,
      "avatar" => user.avatar || "",
      "fullName" => user.full_name || "",
      "isOnline" => user.is_online,
      "lastSeen" => user.last_seen,
      "role" => user.role,
      "isVerified" => user.is_verified
    }
  end

  def private_fields(user) do
    Map.merge(public_fields(user), %{
      "email" => user.email,
      "notificationsEnabled" => user.notifications_enabled,
      "privacySettings" => user.privacy_settings,
      "isSuspended" => user.is_suspended,
      "fcmTokens" => user.fcm_tokens
    })
  end
end
