import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://vnvdldbpberpfkddaiqr.supabase.co";
const supabaseKey = "sb_publishable_T-vdZ4fZ7FRaUkDCwCLcug_bi37ekbC";

export const supabase = createClient(supabaseUrl, supabaseKey);
