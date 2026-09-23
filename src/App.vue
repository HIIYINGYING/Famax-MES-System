<template>
  <!-- Login page has no sidebar/topbar -->
  <RouterView v-if="route.meta.public" />

  <div v-else class="layout">
    <Sidebar :role="role" @logout="handleLogout" />

    <div class="main">
      <Topbar :userName="userName" :department="role" :unreadCount="unreadCount" />
      <div class="content">
        <RouterView />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Sidebar from "@/components/Sidebar.vue";
import Topbar from "@/components/Topbar.vue";
import { supabase } from "@/lib/supabase";

const route = useRoute();
const router = useRouter();

const role = ref(null);
const userName = ref("");
const unreadCount = ref(0);

async function loadProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data, error } = await supabase
    .from("user_profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!error && data) {
    role.value = data.role;
    userName.value = data.full_name;
  }
}

onMounted(loadProfile);

// Reload profile info whenever navigating away from the public /login
// route, so the sidebar/topbar populate right after a fresh login.
watch(
  () => route.meta.public,
  (isPublic) => {
    if (!isPublic) loadProfile();
  }
);

async function handleLogout() {
  await supabase.auth.signOut();
  router.push({ name: "login" });
}
</script>

<style>
html, body {
  height: 100%;
  margin: 0;
  overflow: hidden;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
}

.layout {
  display: flex;
  height: 100vh;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content {
  flex: 1;
  overflow-y: auto;
  background: #f7f7f9;
}
</style>