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

export const validateProviderLicensePhoto = (photo) => {
  if (!photo) return 'Choose a photo of your provider license.';
  if (!IDENTITY_PHOTO_TYPES.has(photo.type) || photo.size > MAX_IDENTITY_PHOTO_SIZE) {
    return 'Choose a JPG or PNG photo under 10 MB.';
  }
  return '';
};

const uploadVerificationDocument = async (supabase, userId, verificationType, fileName, photo) => {
  const extension = photo.type === 'image/png' ? 'png' : 'jpg';
  const documentPath = `${userId}/${crypto.randomUUID()}-${fileName}.${extension}`;
  const storage = supabase.storage.from('provider-verification');
  const { error: uploadError } = await storage.upload(documentPath, photo, {
    contentType: photo.type,
    cacheControl: '3600',
    upsert: false,
  });

  if (uploadError) throw new Error(uploadError.message);

  const { data, error: submitError } = await supabase.from('provider_verifications').insert({
    provider_id: userId,
    verification_type: verificationType,
    document_url: documentPath,
    status: 'pending',
  }).select('status, document_url, created_at, notes, expires_at').single();

  if (submitError) {
    const { error: cleanupError } = await storage.remove([documentPath]);
    throw new Error(cleanupError
      ? `${submitError.message} Could not remove the uploaded photo: ${cleanupError.message}`
      : submitError.message);
  }

  return data;
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

export const submitProviderLicenseVerification = async (supabase, userId, photo) => {
  const validationError = validateProviderLicensePhoto(photo);
  if (validationError) throw new Error(validationError);
  return uploadVerificationDocument(supabase, userId, 'license', 'provider-license', photo);
};
