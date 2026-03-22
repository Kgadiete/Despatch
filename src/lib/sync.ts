import { supabase, STORAGE_BUCKET } from './supabase';
import {
  getUnsyncedTrucks,
  getUnsyncedSlips,
  markTruckSynced,
  markSlipSynced,
  getPhotoBySlipId,
  deletePhoto,
  getTruckById,
} from './db';

export async function syncAll(): Promise<{ synced: number; failed: number }> {
  let synced = 0;
  let failed = 0;

  // Sync trucks first
  const unsyncedTrucks = await getUnsyncedTrucks();
  for (const truck of unsyncedTrucks) {
    try {
      const { error } = await supabase
        .from('trucks')
        .upsert({ id: truck.id, reg_no: truck.reg_no, created_at: truck.created_at }, { onConflict: 'reg_no' });
      if (error) throw error;
      await markTruckSynced(truck.id);
      synced++;
    } catch (e) {
      console.error('Failed to sync truck:', truck.reg_no, e);
      failed++;
    }
  }

  // Then sync slips
  const unsyncedSlips = await getUnsyncedSlips();
  for (const slip of unsyncedSlips) {
    try {
      let photoUrl = slip.photo_url || '';

      // Upload photo if available
      const localPhoto = await getPhotoBySlipId(slip.id);
      if (localPhoto) {
        const truck = await getTruckById(slip.truck_id);
        const regNo = truck?.reg_no || 'unknown';
        const safeName = regNo.replace(/\s+/g, '_');
        const timestamp = new Date(slip.scanned_at).getTime();
        const path = `${safeName}/${slip.job_number}_${timestamp}.jpg`;

        const { error: uploadErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, localPhoto.blob, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
        photoUrl = urlData.publicUrl;

        // Clean up local blob
        await deletePhoto(slip.id);
      }

      const { error } = await supabase.from('slips').upsert({
        id: slip.id,
        truck_id: slip.truck_id,
        job_number: slip.job_number,
        cs_number: slip.cs_number,
        customer: slip.customer,
        service_type: slip.service_type,
        tyre_make: slip.tyre_make,
        tyre_size: slip.tyre_size,
        serial: slip.serial,
        photo_url: photoUrl,
        invoice_number: slip.invoice_number,
        notes: slip.notes,
        scanned_at: slip.scanned_at,
        created_at: slip.created_at,
        updated_at: slip.updated_at,
      });

      if (error) throw error;
      await markSlipSynced(slip.id, photoUrl);
      synced++;
    } catch (e) {
      console.error('Failed to sync slip:', slip.job_number, e);
      failed++;
    }
  }

  return { synced, failed };
}

export async function deleteSlipFromSupabase(slipId: string): Promise<void> {
  await supabase.from('slips').delete().eq('id', slipId);
}

export async function deleteTruckFromSupabase(truckId: string): Promise<void> {
  // Cascade deletes slips in Supabase via FK
  await supabase.from('trucks').delete().eq('id', truckId);
}

export async function updateSlipInSupabase(
  slipId: string,
  changes: Record<string, unknown>
): Promise<void> {
  await supabase.from('slips').update(changes).eq('id', slipId);
}
