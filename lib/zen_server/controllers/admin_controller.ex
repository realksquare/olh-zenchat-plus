defmodule ZenServer.AdminController do
  use Phoenix.Controller, formats: [:json]
  import Plug.Conn
  import Ecto.Query
  alias ZenServer.Repo
  alias ZenServer.Schema.{User, Message}

  defp admin_check(conn) do
    user = conn.assigns.current_user
    if user.role in ["co_admin", "master_admin"], do: {:ok, user}, else: {:error, :forbidden}
  end

  def stats(conn, _params) do
    case admin_check(conn) do
      {:error, _} -> conn |> put_status(403) |> json(%{message: "Admin access denied"})
      {:ok, _} ->
        total_users = Repo.aggregate(User, :count)
        messages_count = Repo.aggregate(Message, :count)

        today = DateTime.utc_now() |> DateTime.add(-24 * 3600, :second)
        dau = from(u in User, where: u.is_online == true or u.last_seen >= ^today) |> Repo.aggregate(:count)

        json(conn, %{
          totalUsers: total_users,
          messagesCount: messages_count,
          dauCount: dau,
          serverStatus: %{phoenix: "Online"}
        })
    end
  end

  def users(conn, _params) do
    case admin_check(conn) do
      {:error, _} -> conn |> put_status(403) |> json(%{message: "Admin access denied"})
      {:ok, _} ->
        users = Repo.all(from u in User, order_by: [desc: u.inserted_at]) |> Enum.map(&User.public_fields/1)
        json(conn, %{users: users})
    end
  end

  def toggle_verify(conn, %{"user_id" => user_id}) do
    case admin_check(conn) do
      {:error, _} -> conn |> put_status(403) |> json(%{message: "Admin access denied"})
      {:ok, _} ->
        user = Repo.get(User, user_id)
        if is_nil(user) do
          conn |> put_status(404) |> json(%{message: "User not found"})
        else
          {:ok, updated} = Repo.update(Ecto.Changeset.change(user, %{is_verified: !user.is_verified}))
          json(conn, %{user: User.public_fields(updated)})
        end
    end
  end

  def update_role(conn, %{"user_id" => user_id, "role" => role}) do
    case admin_check(conn) do
      {:error, _} -> conn |> put_status(403) |> json(%{message: "Admin access denied"})
      {:ok, admin_user} ->
        target = Repo.get(User, user_id)
        cond do
          is_nil(target) ->
            conn |> put_status(404) |> json(%{message: "User not found"})
          target.username == "admin_krish" ->
            conn |> put_status(403) |> json(%{message: "Cannot modify master admin"})
          admin_user.role != "master_admin" && role == "master_admin" ->
            conn |> put_status(403) |> json(%{message: "Only master admin can promote to master"})
          true ->
            {:ok, updated} = Repo.update(Ecto.Changeset.change(target, %{role: role}))
            json(conn, %{user: User.public_fields(updated)})
        end
    end
  end

  def toggle_suspend(conn, %{"user_id" => user_id}) do
    case admin_check(conn) do
      {:error, _} -> conn |> put_status(403) |> json(%{message: "Admin access denied"})
      {:ok, _} ->
        target = Repo.get(User, user_id)
        cond do
          is_nil(target) ->
            conn |> put_status(404) |> json(%{message: "User not found"})
          target.username == "admin_krish" ->
            conn |> put_status(403) |> json(%{message: "Cannot suspend master admin"})
          true ->
            {:ok, updated} = Repo.update(Ecto.Changeset.change(target, %{is_suspended: !target.is_suspended}))
            json(conn, %{user: User.public_fields(updated)})
        end
    end
  end

  def delete_user(conn, %{"user_id" => user_id}) do
    case admin_check(conn) do
      {:error, _} -> conn |> put_status(403) |> json(%{message: "Admin access denied"})
      {:ok, _} ->
        target = Repo.get(User, user_id)
        cond do
          is_nil(target) ->
            conn |> put_status(404) |> json(%{message: "User not found"})
          target.username == "admin_krish" ->
            conn |> put_status(403) |> json(%{message: "Cannot delete master admin"})
          true ->
            Repo.delete!(target)
            json(conn, %{message: "User deleted successfully"})
        end
    end
  end
end
