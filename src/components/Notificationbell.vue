<template>
  <div class="bell-wrap">
    <button class="bell" @click="toggleOpen" aria-label="Notifications">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </svg>
      <span v-if="unreadCount > 0" class="badge">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
    </button>

    <div v-if="open" class="dropdown" @click.self="open = false">
      <div class="dropdown-header">
        <strong>Notifications</strong>
        <button v-if="unreadCount > 0" class="mark-all" @click="markAllRead">Mark all read</button>
      </div>

      <div v-if="loading" class="loading">Loading…</div>
      <ul v-else class="list">
        <li v-for="n in notifications" :key="n.id" :class="{ unread: !n.is_read }" @click="markRead(n)">
          <p>{{ n.message }}</p>
          <span class="time">{{ timeAgo(n.created_at) }}</span>
        </li>
        <li v-if="notifications.length === 0" class="empty">No notifications yet.</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
defineOptions({ name: "NotificationBell" });
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { supabase } from "@/lib/supabase";

const notifications = ref([]);
const loading = ref(true);
const open = ref(false);
let pollTimer = null;

const unreadCount = computed(() => notifications.value.filter((n) => !n.is_read).length);

function timeAgo(ts) {
  const diffMin = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return new Date(ts).toLocaleDateString();
}

async function loadNotifications() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);
  notifications.value = data ?? [];
  loading.value = false;
}

function toggleOpen() {
  open.value = !open.value;
}

async function markRead(n) {
  if (n.is_read) return;
  n.is_read = true; // optimistic
  await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
}

async function markAllRead() {
  const unreadIds = notifications.value.filter((n) => !n.is_read).map((n) => n.id);
  notifications.value.forEach((n) => (n.is_read = true));
  if (unreadIds.length > 0) {
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
  }
}

onMounted(() => {
  loadNotifications();
  // Simple polling every 30s — swap for a Supabase Realtime subscription
  // later if instant push updates are needed.
  pollTimer = setInterval(loadNotifications, 30000);
});

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<style scoped>
.bell-wrap { position: relative; }
.bell {
  position: relative;
  border: none;
  background: none;
  cursor: pointer;
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 1px solid #e5eaf1;
  border-radius: 9px;
  color: #56677e;
  background: #fff;
}
.bell svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.7; }
.badge {
  position: absolute;
  top: -4px;
  right: -6px;
  background: #c34450;
  color: white;
  border-radius: 50%;
  font-size: 10px;
  padding: 1px 5px;
  line-height: 1;
}
.dropdown {
  position: absolute;
  top: 28px;
  right: 0;
  width: 320px;
  max-height: 400px;
  overflow-y: auto;
  background: #fff;
  border: 1px solid #e2e2e2;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  z-index: 50;
}
.dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid #eee;
  font-size: 13px;
}
.mark-all {
  background: none;
  border: none;
  color: #3f51b5;
  cursor: pointer;
  font-size: 12px;
}
.list { list-style: none; margin: 0; padding: 0; }
.list li {
  padding: 10px 12px;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  font-size: 12px;
}
.list li:hover { background: #f7f7f9; }
.list li.unread { background: #f0f3ff; }
.list li p { margin: 0 0 4px; color: #333; }
.time { color: #999; font-size: 11px; }
.loading, .empty { padding: 16px 12px; text-align: center; color: #888; font-size: 12px; }
</style>
