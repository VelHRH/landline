<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import { RouteName, routeName } from "@/router";
import Button from "@/ui/button/Button.vue";
import { buttonBaseClasses, sizeClasses } from "@/ui/button/button-config";
import { ButtonSize } from "@/ui/button/button-size";
import { ButtonVariant } from "@/ui/button/button-variant";
import { useSessionStore } from "./session.store";

defineProps<{ logoutDisabled: boolean }>();

const emit = defineEmits<{
  logout: [];
  navigate: [];
}>();

const route = useRoute();
const session = useSessionStore();
const { t } = useI18n();

const chatsActive = computed(() =>
  [routeName(RouteName.CHATS), routeName(RouteName.CHAT)].includes(String(route.name)),
);
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <nav :aria-label="t('navigation.label')" class="flex-1 py-6">
      <RouterLink
        :to="{ name: routeName(RouteName.CHATS) }"
        :class="[
          buttonBaseClasses,
          sizeClasses[ButtonSize.DEFAULT],
          'w-full justify-start',
          chatsActive
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground active:bg-muted',
        ]"
        :aria-current="chatsActive ? 'location' : undefined"
        @click="emit('navigate')"
      >
        {{ t("navigation.chats") }}
      </RouterLink>
    </nav>

    <div class="border-t border-border pt-4">
      <p class="text-caption text-muted-foreground">{{ t("navigation.signedInAs") }}</p>
      <p class="mt-1 truncate font-mono text-caption" :title="session.user?.email">
        {{ session.user?.email }}
      </p>
      <Button
        type="button"
        :variant="ButtonVariant.SECONDARY"
        class="mt-4 w-full"
        :disabled="logoutDisabled"
        :loading="logoutDisabled"
        @click="emit('logout')"
      >
        {{ t("navigation.logout") }}
      </Button>
    </div>
  </div>
</template>
