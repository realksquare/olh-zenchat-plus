defmodule ZenServer.Guardian do
  use Guardian, otp_app: :zen_server

  alias ZenServer.Repo
  alias ZenServer.Schema.User

  def subject_for_token(user, _claims) when is_struct(user, User) do
    {:ok, user.id}
  end

  def subject_for_token(_, _), do: {:error, :invalid_resource}

  def resource_from_claims(%{"sub" => id}) do
    case Repo.get(User, id) do
      nil -> {:error, :not_found}
      user -> {:ok, user}
    end
  end

  def resource_from_claims(_), do: {:error, :invalid_claims}
end
