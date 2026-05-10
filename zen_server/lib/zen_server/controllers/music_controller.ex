defmodule ZenServer.MusicController do
  use Phoenix.Controller, formats: [:json]
  import Plug.Conn

  def search(conn, %{"q" => q}) do
    [deezer_result, itunes_result] = Task.await_many([
      Task.async(fn -> search_deezer(q) end),
      Task.async(fn -> search_itunes(q) end)
    ], 8000)

    max_len = max(length(deezer_result), length(itunes_result))
    combined = Enum.flat_map(0..(max_len - 1), fn i ->
      [Enum.at(deezer_result, i), Enum.at(itunes_result, i)]
      |> Enum.filter(& &1)
    end)

    json(conn, combined)
  end

  def search(conn, _), do: conn |> put_status(400) |> json(%{message: "Query required"})

  defp search_deezer(q) do
    url = "https://api.deezer.com/search?q=#{URI.encode_www_form(q)}&limit=25"
    case request(url) do
      {:ok, %{"data" => tracks}} ->
        Enum.map(tracks, fn t -> %{
          "id" => "deezer-#{t["id"]}",
          "title" => t["title"],
          "artist" => t["artist"]["name"],
          "previewUrl" => t["preview"],
          "coverUrl" => t["album"]["cover_medium"] || "",
          "totalDuration" => t["duration"],
          "source" => "Deezer"
        } end)
      _ -> []
    end
  end

  defp search_itunes(q) do
    url = "https://itunes.apple.com/search?term=#{URI.encode_www_form(q)}&media=music&limit=25"
    case request(url) do
      {:ok, %{"results" => tracks}} ->
        Enum.map(tracks, fn t -> %{
          "id" => "itunes-#{t["trackId"]}",
          "title" => t["trackName"],
          "artist" => t["artistName"],
          "previewUrl" => t["previewUrl"],
          "coverUrl" => t["artworkUrl100"],
          "totalDuration" => floor((t["trackTimeMillis"] || 0) / 1000),
          "source" => "iTunes"
        } end)
      _ -> []
    end
  end

  defp request(url) do
    case Finch.build(:get, url) |> Finch.request(ZenServer.Finch) do
      {:ok, %{status: 200, body: body}} -> Jason.decode(body)
      _ -> {:error, :request_failed}
    end
  end
end
