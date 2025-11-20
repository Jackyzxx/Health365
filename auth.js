const SUPABASE_URL = "https://ptnqtkpwpdtcrdhrmnqi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0bnF0a3B3cGR0Y3JkaHJtbnFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MDkxNDcsImV4cCI6MjA3OTE4NTE0N30.9Pg8J_iVXQ-j2rPiktIFZg5upqGD1nNCGVEVgoyAFo0";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Verificar se usuário está autenticado
async function checkAuth() {
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    return { user, error };
}

// Fazer logout
async function logout() {
    const { error } = await supabaseClient.auth.signOut();
    return { error };
}

// Obter usuário atual
async function getCurrentUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    return user;
}