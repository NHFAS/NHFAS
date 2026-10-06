const IDENTITY_PHOTO_TYPES = new Set(['image/jpeg', 'image/png']);
const MAX_IDENTITY_PHOTO_SIZE = 10 * 1024 * 1024;

export const validateIdentityPhotos = (photos) => {
  const sides = ['front', 'back'];
  if (sides.some((side) => !photos[side])) {
    return 'Choose a photo of both the front and back of your Fayda ID.';
  }

  if (sides.some((side) => !IDENTITY_PHOTO_TYPES.has(photos[side].type) || photos[side].size > MAX_IDENTITY_PHOTO_SIZE)) {
    return 'Choose JPG or PNG photos under 10 MB each.';
  }

  return '';
};

export const submitIdentityVerification = async (supabase, userId, photos) => {
  const sides = ['front', 'back'];
  const validationError = validateIdentityPhotos(photos);
  if (validationError) throw new Error(validationError);

  const documentPaths = {};
  const uploadedPaths = [];
  const storage = supabase.storage.from('provider-verification');

  for (const side of sides) {
    const photo = photos[side];
    const extension = photo.type === 'image/png' ? 'png' : 'jpg';
    const documentPath = `${userId}/${crypto.randomUUID()}-fayda-${side}.${extension}`;
    const { error: uploadError } = await storage.upload(documentPath, photo, {
      contentType: photo.type,
      cacheControl: '3600',
      upsert: false,
    });

    if (uploadError) {
      const { error: cleanupError } = uploadedPaths.length
        ? await storage.remove(uploadedPaths)
        : { error: null };
      throw new Error(cleanupError
        ? `${uploadError.message} Could not remove the partial upload: ${cleanupError.message}`
        : uploadError.message);
    }

    documentPaths[side] = documentPath;
    uploadedPaths.push(documentPath);
  }

  const { data, error: submitError } = await supabase.from('provider_verifications').insert({
    provider_id: userId,
    verification_type: 'identity',
    document_url: JSON.stringify(documentPaths),
    status: 'pending',
  }).select('status, document_url, created_at, notes, expires_at').single();

  if (submitError) {
    const { error: cleanupError } = await storage.remove(uploadedPaths);
    throw new Error(cleanupError
      ? `${submitError.message} Could not remove the uploaded photos: ${cleanupError.message}`
      : submitError.message);
  }

  return data;
};
