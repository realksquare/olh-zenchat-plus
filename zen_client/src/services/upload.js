import api from './api';

export const uploadMedia = async (uri, type = 'image') => {
  const formData = new FormData();
  
  const fileExtension = uri.split('.').pop();
  const mimeType = type === 'image' ? `image/${fileExtension}` : `video/${fileExtension}`;
  
  formData.append('media', {
    uri: uri,
    name: `media_${Date.now()}.${fileExtension}`,
    type: mimeType,
  });

  try {
    const response = await api.post('/message/media', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return { success: true, url: response.data.url };
  } catch (error) {
    console.error('Media upload failed:', error);
    return { success: false, error: 'Upload failed' };
  }
};
