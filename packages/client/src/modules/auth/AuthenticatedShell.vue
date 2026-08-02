<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { RouteName, routeName } from "@/router";
import AuthenticatedNavigation from "./AuthenticatedNavigation.vue";
import { useSessionStore } from "./session.store";

const route = useRoute();
const router = useRouter();
const session = useSessionStore();
const { t } = useI18n();

const drawerOpen = ref(false);
const loggingOut = ref(false);
const drawer = ref<HTMLElement | null>(null);
const menuButton = ref<HTMLButtonElement | null>(null);
const closeButton = ref<HTMLButtonElement | null>(null);
const mobileControlClasses =
  "cursor-pointer rounded-sm text-caption text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const openDrawer = async () => {
  drawerOpen.value = true;
  await nextTick();
  closeButton.value?.focus();
};

const closeDrawer = async (restoreFocus = true) => {
  drawerOpen.value = false;
  if (restoreFocus) {
    await nextTick();
    menuButton.value?.focus();
  }
};

const handleDrawerKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    event.preventDefault();
    void closeDrawer();
    return;
  }

  if (event.key !== "Tab" || drawer.value === null) return;

  const focusable = Array.from(
    drawer.value.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex="0"]'),
  );
  const first = focusable[0];
  const last = focusable.at(-1);

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
};

const logout = async () => {
  if (loggingOut.value) return;

  loggingOut.value = true;
  try {
    await session.logout();
  } finally {
    loggingOut.value = false;
    await closeDrawer(false);
    await router.replace({ name: routeName(RouteName.AUTH) });
  }
};

watch(
  () => route.fullPath,
  () => {
    if (drawerOpen.value) void closeDrawer(false);
  },
);
</script>

<template>
  <div class="flex h-dvh overflow-hidden bg-background">
    <aside class="hidden w-64 shrink-0 flex-col border-r border-border bg-card px-5 py-6 md:flex">
      <p class="text-h3 font-medium">Landline</p>
      <AuthenticatedNavigation :logout-disabled="loggingOut" @logout="logout" />
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header
        class="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-5 md:hidden"
      >
        <p class="font-medium">Landline</p>
        <button
          ref="menuButton"
          type="button"
          :class="mobileControlClasses"
          :aria-label="t('navigation.openMenu')"
          aria-controls="mobile-navigation"
          :aria-expanded="drawerOpen"
          @click="openDrawer"
        >
          {{ t("navigation.menu") }}
        </button>
      </header>

      <div class="min-h-0 flex-1 overflow-y-auto">
        <slot />
      </div>
    </div>

    <div v-if="drawerOpen" class="fixed inset-0 z-50 md:hidden">
      <div class="absolute inset-0 bg-background/80" aria-hidden="true" @click="closeDrawer()" />
      <aside
        id="mobile-navigation"
        ref="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-navigation-title"
        class="absolute inset-y-0 right-0 flex w-[min(20rem,85vw)] flex-col border-l border-border bg-card px-5 py-6 shadow-md"
        @keydown="handleDrawerKeydown"
      >
        <div class="flex items-center justify-between gap-4">
          <h2 id="mobile-navigation-title" class="text-h3 font-medium">
            {{ t("navigation.menu") }}
          </h2>
          <button
            ref="closeButton"
            type="button"
            :class="mobileControlClasses"
            :aria-label="t('navigation.closeMenu')"
            @click="closeDrawer()"
          >
            {{ t("navigation.close") }}
          </button>
        </div>
        <AuthenticatedNavigation
          :logout-disabled="loggingOut"
          @navigate="closeDrawer(false)"
          @logout="logout"
        />
      </aside>
    </div>
  </div>
</template>
