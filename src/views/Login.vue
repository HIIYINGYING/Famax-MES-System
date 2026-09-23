<template>
  <div class="login-page">
    <div class="login-card">

      <img
        src="/famax-logo.png"
        alt="FAMAX"
        class="logo"
      />

      <h2>FAMAX MES SYSTEM</h2>

      <form @submit.prevent="handleLogin">

        <label>Username</label>

        <input
          v-model="username"
          type="text"
          placeholder="e.g. admin"
          required
        />

        <label>Password</label>

        <input
          v-model="password"
          type="password"
          placeholder="Enter password"
          required
        />

        <p v-if="error" class="error">
          {{ error }}
        </p>

        <button
          type="submit"
          :disabled="loading"
        >
          {{ loading ? "Logging in…" : "Login" }}
        </button>

      </form>

    </div>
  </div>
</template>

<script setup>
defineOptions({ name: "LoginPage" });
import { ref } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "@/lib/supabase";

const username = ref("");
const password = ref("");

const loading = ref(false);
const error = ref("");

const router = useRouter();

async function handleLogin() {

  loading.value = true;
  error.value = "";

  try {

    // 1. Find the username in user_profiles
    const { data: userProfile, error: profileError } =
      await supabase
        .from("user_profiles")
        .select("email, username, full_name, role, department")
        .eq("username", username.value.trim())
        .single();

    if (profileError || !userProfile) {
      error.value = "Username not found.";
      loading.value = false;
      return;
    }

    // 2. Login using the email connected to the username
    const { error: authError } =
      await supabase.auth.signInWithPassword({
        email: userProfile.email,
        password: password.value,
      });

    if (authError) {
      error.value = authError.message; // TEMP: shows the real reason
      loading.value = false;
      return;
    }

    // 3. Login successful
    router.push({ name: "dashboard" });

  } catch (err) {

    console.error(err);

    error.value = "Unable to login. Please try again.";

  } finally {

    loading.value = false;

  }
}
</script>
