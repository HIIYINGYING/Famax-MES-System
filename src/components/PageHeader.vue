<template>
  <div class="page-header-formal">
    <div class="brand-mark">
      <img src="/famax-logo.png" alt="FAMAX" class="logo" />
    </div>
    <div class="titles">
      <h1>{{ title }}</h1>
      <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
    </div>
    <div class="actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: "" },
});
</script>

<style scoped>
.page-header-formal {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 2px solid #1a237e;
}
.brand-mark .logo {
  height: 32px;
}
.titles {
  flex: 1;
}
.titles h1 {
  font-size: 19px;
  margin: 0;
  color: #1a237e;
  font-weight: 700;
}
.subtitle {
  font-size: 12px;
  color: #888;
  margin: 2px 0 0;
}
.actions {
  display: flex;
  gap: 8px;
}
</style>