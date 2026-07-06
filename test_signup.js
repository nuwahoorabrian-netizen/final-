import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://qqmzhdnofylwjkyqeqei.supabase.co";
const supabaseKey = "sb_publishable_L_zJii59FBUF_9tggtiQ4Q_exE4x_wR";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.auth.signUp({
    email: 'teststudent123@gmail.com',
    password: 'password123',
    options: {
      data: {
        name: 'Test Student',
        department: 'IT',
        role: 'user'
      }
    }
  });
  console.log("Signup Result:", { data, error });
}
run();
