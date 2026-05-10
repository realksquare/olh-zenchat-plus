defmodule ZenServer.Schema.Moment do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "moments" do
    field :media_url, :string
    field :media_type, :string, default: "image"
    field :caption, :string
    field :expires_at, :utc_datetime
    field :song_data, :map, default: %{}
    belongs_to :user, ZenServer.Schema.User
    has_many :views, ZenServer.Schema.MomentView
    timestamps()
  end

  def changeset(moment, params) do
    moment
    |> cast(params, [:media_url, :media_type, :caption, :expires_at, :song_data, :user_id])
    |> validate_required([:media_url, :user_id])
  end
end

defmodule ZenServer.Schema.MomentView do
  use Ecto.Schema

  @primary_key false
  @foreign_key_type :binary_id

  schema "moment_views" do
    belongs_to :moment, ZenServer.Schema.Moment
    belongs_to :viewer, ZenServer.Schema.User, foreign_key: :viewer_id
    field :viewed_at, :utc_datetime
  end
end
