<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import AuthenticatedShell from "@/modules/auth/AuthenticatedShell.vue";

const route = useRoute();
const isPublicRoute = computed(() => route.meta.public === true);
</script>

<template>
  <RouterView v-if="isPublicRoute" />
  <AuthenticatedShell v-else>
    <RouterView />
  </AuthenticatedShell>
</template>
