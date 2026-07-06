import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://qqmzhdnofylwjkyqeqei.supabase.co";
const supabaseKey = "sb_publishable_L_zJii59FBUF_9tggtiQ4Q_exE4x_wR";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, name, email')
    .limit(20);
  console.log("Profiles:", data, error);
}
run();
