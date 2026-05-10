defmodule ZenServer.MomentController do
  import Plug.Conn
  use Phoenix.Controller
  import Ecto.Query

  alias ZenServer.Repo
  alias ZenServer.Schema.{Moment, MomentView, User}

  def index(conn, _params) do
    user_id = conn.assigns.current_user_id
    now = DateTime.utc_now()

    moments =
      from(m in Moment,
        where: m.expires_at > ^now,
        order_by: [desc: m.inserted_at],
        preload: [:user, :views]
      )
      |> Repo.all()

    serialized = Enum.map(moments, &serialize_moment(&1, user_id))
    json(conn, %{moments: serialized})
  end

  def create(conn, params) do
    user_id = conn.assigns.current_user_id
    expires_at = DateTime.utc_now() |> DateTime.add(24 * 3600, :second)

    attrs = %{
      media_url: params["mediaUrl"],
      media_type: params["type"] || "text",
      caption: params["content"] || params["caption"],
      song_data: params["songData"] || %{},
      expires_at: expires_at,
      user_id: user_id
    }

    case Repo.insert(Moment.changeset(%Moment{}, attrs)) do
      {:ok, moment} ->
        moment = Repo.preload(moment, [:user, :views])
        conn |> put_status(201) |> json(%{moment: serialize_moment(moment, user_id)})
      {:error, changeset} ->
        IO.inspect(changeset.errors)
        conn |> put_status(400) |> json(%{message: "Failed to create moment"})
    end
  end

  def view(conn, %{"id" => id}) do
    viewer_id = conn.assigns.current_user_id
    moment = Repo.get!(Moment, id)

    Repo.insert_all(MomentView, [%{
      moment_id: id,
      viewer_id: viewer_id,
      viewed_at: DateTime.utc_now()
    }], on_conflict: :nothing)

    moment = Repo.preload(moment, [:user, :views])
    json(conn, %{moment: serialize_moment(moment, viewer_id)})
  end

  def delete(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id
    moment = Repo.get!(Moment, id)

    if moment.user_id == user_id do
      Repo.delete!(moment)
      json(conn, %{message: "Deleted"})
    else
      conn |> put_status(403) |> json(%{message: "Forbidden"})
    end
  end

  defp serialize_moment(moment, viewer_id) do
    viewer_ids = Enum.map(moment.views, & &1.viewer_id)
    %{
      "id" => moment.id,
      "mediaUrl" => moment.media_url,
      "mediaType" => moment.media_type,
      "caption" => moment.caption,
      "songData" => moment.song_data,
      "expiresAt" => moment.expires_at,
      "user" => User.public_fields(moment.user),
      "viewCount" => length(moment.views),
      "viewedByMe" => viewer_id in viewer_ids,
      "createdAt" => moment.inserted_at
    }
  end
end
