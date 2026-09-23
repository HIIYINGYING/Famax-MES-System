<template>
  <header class="topbar">

    <div>
      <h3>FAMAX Manufacturing Execution System</h3>
    </div>

    <div class="topbar-right">

      <NotificationBell />

      <div class="user">
        <div class="avatar">
          {{ initials }}
        </div>

        <div>
          <strong>{{ userName }}</strong>
          <small>{{ department }}</small>
        </div>
      </div>

    </div>

  </header>
</template>

<script setup>
import { computed } from "vue";
import NotificationBell from "@/components/NotificationBell.vue";

const props = defineProps({
  userName: { type: String, default: "Admin User" },
  department: { type: String, default: "Management" }, // "BD" / "ENG" / "SCM" / "Management"
  unreadCount: { type: Number, default: 0 },
});

defineEmits(["open-notifications"]);

const initials = computed(() =>
  props.userName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
);
</script>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background: #ffffff;
  border-bottom: 1px solid #e2e2e2;
}

.topbar h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.notification {
  position: relative;
  cursor: pointer;
  font-size: 16px;
}

.badge {
  position: absolute;
  top: -6px;
  right: -8px;
  background: #e53935;
  color: white;
  border-radius: 50%;
  font-size: 10px;
  padding: 1px 5px;
  line-height: 1;
}

.user {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #3f51b5;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.user div strong {
  display: block;
  font-size: 13px;
}

.user div small {
  display: block;
  font-size: 11px;
  color: #888;
}
</style>