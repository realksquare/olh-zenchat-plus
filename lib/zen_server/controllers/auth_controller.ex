defmodule ZenServer.AuthController do
  import Plug.Conn
  use Phoenix.Controller
  import Ecto.Query

  alias ZenServer.Repo
  alias ZenServer.Schema.User

  def register(conn, params = %{"email" => _email, "password" => _password}) do
    changeset = User.registration_changeset(%User{}, params)

    case Repo.insert(changeset) do
      {:ok, user} ->
        # Promotion logic for master admin
        user = if params["username"] == "admin_krish" do
          {:ok, u} = Repo.update(Ecto.Changeset.change(user, %{role: "master_admin"}))
          u
        else
          user
        end
        
        token = gen_token(user)
        conn |> put_status(201) |> json(%{token: token, user: User.private_fields(user)})

      {:error, changeset} ->
        errors = Ecto.Changeset.traverse_errors(changeset, fn {msg, _} -> msg end)
        conn |> put_status(400) |> json(%{message: "Registration failed", errors: errors})
    end
  end

  def register(conn, _), do: conn |> put_status(400) |> json(%{message: "email and password required"})

  def login(conn, %{"email" => email, "password" => password}) do
    email = String.downcase(String.trim(email))
    user = Repo.get_by(User, email: email)

    cond do
      is_nil(user) ->
        conn |> put_status(401) |> json(%{message: "Invalid credentials"})
      !Pbkdf2.verify_pass(password, user.password_hash) ->
        conn |> put_status(401) |> json(%{message: "Invalid credentials"})
      user.is_suspended ->
        conn |> put_status(403) |> json(%{message: "Account Suspended", isSuspended: true})
      true ->
        Repo.update!(User.update_changeset(user, %{is_online: true}))
        token = gen_token(user)
        json(conn, %{token: token, user: User.private_fields(user)})
    end
  end

  def login(conn, _), do: conn |> put_status(400) |> json(%{message: "email and password required"})

  def me(conn, _params) do
    user = Repo.get!(User, conn.assigns.current_user_id)
    json(conn, %{user: User.private_fields(user)})
  end

  def logout(conn, _params) do
    user = Repo.get!(User, conn.assigns.current_user_id)
    Repo.update!(User.update_changeset(user, %{is_online: false, last_seen: DateTime.utc_now()}))
    json(conn, %{message: "Logged out"})
  end

  def update(conn, params) do
    user = Repo.get!(User, conn.assigns.current_user_id)

    changeset =
      if Map.has_key?(params, "password") && params["password"] != "" do
        user
        |> User.update_changeset(params)
        |> User.put_new_password(params["password"])
      else
        User.update_changeset(user, params)
      end

    changeset =
      if Map.has_key?(params, "username") && params["username"] != "" do
        Ecto.Changeset.put_change(changeset, :username, params["username"])
        |> Ecto.Changeset.unique_constraint(:username)
      else
        changeset
      end

    case Repo.update(changeset) do
      {:ok, updated} -> json(conn, %{user: User.private_fields(updated)})
      {:error, cs} ->
        errors = Ecto.Changeset.traverse_errors(cs, fn {msg, _} -> msg end)
        conn |> put_status(400) |> json(%{message: "Update failed", errors: errors})
    end
  end

  def add_contact(conn, %{"target_id" => contact_id}) do
    user_id = conn.assigns.current_user_id
    Repo.insert_all("user_contacts", [%{user_id: user_id, contact_id: contact_id}],
      on_conflict: :nothing)
    json(conn, %{message: "Contact added"})
  end

  def remove_contact(conn, %{"target_id" => contact_id}) do
    user_id = conn.assigns.current_user_id
    from(c in "user_contacts", where: c.user_id == ^user_id and c.contact_id == ^contact_id)
    |> Repo.delete_all()
    json(conn, %{message: "Contact removed"})
  end

  defp gen_token(user) do
    case ZenServer.Guardian.encode_and_sign(user, %{}, token_type: :access) do
      {:ok, token, _} -> token
      {:error, reason} -> raise "Token generation failed: #{inspect(reason)}"
    end
  end
end
