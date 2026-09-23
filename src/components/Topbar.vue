<template>
  <header class="topbar">
    <div class="topbar-left">
      <button class="menu-toggle" type="button" aria-label="Open navigation" @click="emit('toggle-sidebar')">
        <span></span><span></span><span></span>
      </button>
      <div class="page-context">
        <div class="breadcrumb"><span>FAMAX MES</span><span class="breadcrumb-separator">/</span><span>Workspace</span></div>
        <h1>{{ title }}</h1>
      </div>
    </div>

    <div class="topbar-right">
      <NotificationBell />
      <div class="topbar-divider"></div>
      <div class="user-profile">
        <div class="avatar">
          {{ initials }}
        </div>
        <div class="user-copy">
          <strong>{{ userName || "MES User" }}</strong>
          <small>{{ department || "Workspace" }}</small>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
defineOptions({ name: "MesTopbar" });
import { computed } from "vue";
import NotificationBell from "@/components/Notificationbell.vue";

const props = defineProps({
  title: { type: String, default: "Dashboard" },
  userName: { type: String, default: "MES User" },
  department: { type: String, default: "Workspace" },
});

const emit = defineEmits(["toggle-sidebar"]);

const initials = computed(() =>
  (props.userName || "MES User")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
);
</script>
