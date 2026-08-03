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

const { collapsed = false } = defineProps<{ collapsed?: boolean; logoutDisabled: boolean }>();

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
const profileActive = computed(() => route.name === routeName(RouteName.PROFILE));
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <nav
      :aria-label="t('navigation.label')"
      class="flex-1 space-y-2 py-6"
      :class="collapsed ? 'flex flex-col items-center' : undefined"
    >
      <RouterLink
        :to="{ name: routeName(RouteName.CHATS) }"
        :title="collapsed ? t('navigation.chats') : undefined"
        :class="[
          buttonBaseClasses,
          sizeClasses[collapsed ? ButtonSize.ICON : ButtonSize.DEFAULT],
          collapsed ? undefined : 'w-full justify-start',
          chatsActive
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground active:bg-muted',
        ]"
        :aria-current="chatsActive ? 'location' : undefined"
        @click="emit('navigate')"
      >
        <svg
          aria-hidden="true"
          class="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <path d="M5 17.5 3.5 21l4.3-1.7A9 9 0 1 0 5 17.5Z" stroke-linejoin="round" />
        </svg>
        <span :class="collapsed ? 'sr-only' : undefined">{{ t("navigation.chats") }}</span>
      </RouterLink>
      <RouterLink
        :to="{ name: routeName(RouteName.PROFILE) }"
        :title="collapsed ? t('navigation.profile') : undefined"
        :class="[
          buttonBaseClasses,
          sizeClasses[collapsed ? ButtonSize.ICON : ButtonSize.DEFAULT],
          collapsed ? undefined : 'w-full justify-start',
          profileActive
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground active:bg-muted',
        ]"
        :aria-current="profileActive ? 'location' : undefined"
        @click="emit('navigate')"
      >
        <svg
          aria-hidden="true"
          class="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
        </svg>
        <span :class="collapsed ? 'sr-only' : undefined">{{ t("navigation.profile") }}</span>
      </RouterLink>
    </nav>

    <div
      class="border-t border-border pt-4"
      :class="collapsed ? 'flex flex-col items-center gap-3' : undefined"
    >
      <div v-if="collapsed" class="relative">
        <span
          role="img"
          tabindex="0"
          class="group flex size-10 items-center justify-center rounded-sm text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          :aria-label="t('navigation.signedInAsValue', { email: session.user?.email })"
        >
          <svg
            aria-hidden="true"
            class="size-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
          </svg>
          <span
            aria-hidden="true"
            class="pointer-events-none absolute left-full z-10 ml-2 max-w-64 rounded-sm border border-border bg-popover px-3 py-2 font-mono text-caption text-popover-foreground opacity-0 shadow-md motion-safe:transition-opacity group-hover:opacity-100 group-focus:opacity-100"
          >
            {{ session.user?.email }}
          </span>
        </span>
      </div>
      <template v-else>
        <p class="text-caption text-muted-foreground">{{ t("navigation.signedInAs") }}</p>
        <p class="mt-1 truncate font-mono text-caption" :title="session.user?.email">
          {{ session.user?.email }}
        </p>
      </template>
      <Button
        type="button"
        :variant="ButtonVariant.SECONDARY"
        :size="collapsed ? ButtonSize.ICON : ButtonSize.DEFAULT"
        :class="collapsed ? undefined : 'mt-4 w-full'"
        :title="collapsed ? t('navigation.logout') : undefined"
        :disabled="logoutDisabled"
        :loading="logoutDisabled"
        @click="emit('logout')"
      >
        <svg
          v-if="collapsed && !logoutDisabled"
          aria-hidden="true"
          class="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <path d="M14 5H6v14h8" />
          <path d="m13 9 4 3-4 3M9 12h8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span :class="collapsed ? 'sr-only' : undefined">{{ t("navigation.logout") }}</span>
      </Button>
    </div>
  </div>
</template>
