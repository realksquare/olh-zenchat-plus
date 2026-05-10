defmodule ZenServer.Cloudinary do
  @base_url "https://api.cloudinary.com/v1_1"

  def upload(file_path, opts \\ []) do
    config = Application.get_env(:zen_server, :cloudinary)
    cloud_name = config[:cloud_name]
    api_key = config[:api_key]
    api_secret = config[:api_secret]

    timestamp = System.system_time(:second)
    folder = Keyword.get(opts, :folder, "zenchat_media")
    resource_type = Keyword.get(opts, :resource_type, "auto")

    params_to_sign = "folder=#{folder}&timestamp=#{timestamp}#{api_secret}"
    signature = :crypto.hash(:sha, params_to_sign) |> Base.encode16(case: :lower)

    file_content = File.read!(file_path)
    boundary = "----FormBoundary#{System.unique_integer([:positive])}"

    body =
      "--#{boundary}\r\n" <>
      "Content-Disposition: form-data; name=\"file\"; filename=\"upload\"\r\n\r\n" <>
      file_content <> "\r\n" <>
      "--#{boundary}\r\n" <>
      "Content-Disposition: form-data; name=\"api_key\"\r\n\r\n#{api_key}\r\n" <>
      "--#{boundary}\r\n" <>
      "Content-Disposition: form-data; name=\"timestamp\"\r\n\r\n#{timestamp}\r\n" <>
      "--#{boundary}\r\n" <>
      "Content-Disposition: form-data; name=\"folder\"\r\n\r\n#{folder}\r\n" <>
      "--#{boundary}\r\n" <>
      "Content-Disposition: form-data; name=\"signature\"\r\n\r\n#{signature}\r\n" <>
      "--#{boundary}--\r\n"

    url = "#{@base_url}/#{cloud_name}/#{resource_type}/upload"

    case Finch.build(:post, url,
      [{"content-type", "multipart/form-data; boundary=#{boundary}"}],
      body
    ) |> Finch.request(ZenServer.Finch) do
      {:ok, %{status: 200, body: resp_body}} ->
        case Jason.decode(resp_body) do
          {:ok, %{"secure_url" => url}} -> {:ok, url}
          _ -> {:error, :parse_error}
        end
      _ ->
        {:error, :upload_failed}
    end
  end

  def delete_by_url(url, type \\ "image") do
    config = Application.get_env(:zen_server, :cloudinary)
    cloud_name = config[:cloud_name]
    api_key = config[:api_key]
    api_secret = config[:api_secret]

    parts = String.split(url, "/")
    filename_ext = List.last(parts)
    public_id_base = filename_ext |> String.split(".") |> List.first()
    folder = Enum.at(parts, -2)
    public_id = if folder == "upload", do: public_id_base, else: "#{folder}/#{public_id_base}"

    timestamp = System.system_time(:second)
    resource_type = if type == "video", do: "video", else: "image"
    sig_str = "public_id=#{public_id}&timestamp=#{timestamp}#{api_secret}"
    signature = :crypto.hash(:sha, sig_str) |> Base.encode16(case: :lower)

    destroy_url = "#{@base_url}/#{cloud_name}/#{resource_type}/destroy"
    body = "public_id=#{URI.encode_www_form(public_id)}&signature=#{signature}&api_key=#{api_key}&timestamp=#{timestamp}"

    Finch.build(:post, destroy_url,
      [{"content-type", "application/x-www-form-urlencoded"}],
      body
    ) |> Finch.request(ZenServer.Finch)
  end
end
