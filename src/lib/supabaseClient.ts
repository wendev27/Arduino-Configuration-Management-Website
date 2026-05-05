import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: false,
    },
  }
);

export type SensorRecord = {
  sensor_id: number;
  uuid: string;
  mac_address: string;
  barangay_id: number | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  installed_at: string;
};

export type RegisterDeviceResult = {
  data: SensorRecord | null;
  existed: boolean;
  error: Error | null;
};

export async function registerDeviceMac(
  mac: string
): Promise<RegisterDeviceResult> {
  const normalizedMac = mac.trim().toLowerCase();
  if (!normalizedMac) {
    return {
      data: null,
      existed: false,
      error: new Error('Invalid MAC address'),
    };
  }

  const { data: existingDevice, error: selectError } = (await supabase
    .from('sensors')
    .select('*')
    .eq('mac_address', normalizedMac)
    .maybeSingle()) as {
    data: SensorRecord | null;
    error: Error | null;
  };

  if (selectError) {
    return { data: null, existed: false, error: selectError };
  }

  if (existingDevice) {
    if (existingDevice.status !== 'active') {
      await supabase
        .from('sensors')
        .update({ status: 'active' })
        .eq('mac_address', normalizedMac);
    }

    return { data: existingDevice, existed: true, error: null };
  }

  const installedAt = new Date().toISOString();
  const { data: insertedDevice, error: insertError } = (await supabase
    .from('sensors')
    .insert({
      mac_address: normalizedMac,
      status: 'active',
      installed_at: installedAt,
    })
    .select()
    .maybeSingle()) as {
    data: SensorRecord | null;
    error: Error | null;
  };

  if (insertError) {
    const { data: fallbackDevice, error: fallbackError } = (await supabase
      .from('sensors')
      .select('*')
      .eq('mac_address', normalizedMac)
      .maybeSingle()) as {
      data: SensorRecord | null;
      error: Error | null;
    };

    if (fallbackError) {
      return { data: null, existed: false, error: insertError };
    }

    return { data: fallbackDevice, existed: true, error: null };
  }

  return { data: insertedDevice, existed: false, error: null };
}

export async function updateSensorBarangay(
  mac: string,
  barangayId: number
): Promise<{ error: Error | null }> {
  const normalizedMac = mac.trim().toLowerCase();

  const { error } = await supabase
    .from('sensors')
    .update({ barangay_id: barangayId })
    .eq('mac_address', normalizedMac);

  return { error: error as Error | null };
}
