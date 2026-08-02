<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { RouteName, routeName } from "@/router";
import Button from "@/ui/button/Button.vue";
import { ButtonSize } from "@/ui/button/button-size";
import { ButtonVariant } from "@/ui/button/button-variant";
import LandlineWordmark from "@/ui/LandlineWordmark.vue";
import AuthenticatedNavigation from "./AuthenticatedNavigation.vue";
import { useSessionStore } from "./session.store";

const route = useRoute();
const router = useRouter();
const session = useSessionStore();
const { t } = useI18n();

const desktopNavigationStorageKey = "landline:desktop-navigation-collapsed";
const readDesktopNavigationCollapsed = () => {
  try {
    return window.localStorage.getItem(desktopNavigationStorageKey) === "true";
  } catch {
    return false;
  }
};

const drawerOpen = ref(false);
const desktopNavigationCollapsed = ref(readDesktopNavigationCollapsed());
const loggingOut = ref(false);
const drawer = ref<HTMLElement | null>(null);
const menuButton = ref<InstanceType<typeof Button> | null>(null);
const closeButton = ref<InstanceType<typeof Button> | null>(null);

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

const toggleDesktopNavigation = () => {
  desktopNavigationCollapsed.value = !desktopNavigationCollapsed.value;
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

watch(desktopNavigationCollapsed, (collapsed) => {
  try {
    window.localStorage.setItem(desktopNavigationStorageKey, String(collapsed));
  } catch {
    return;
  }
});
</script>

<template>
  <div class="flex h-dvh overflow-hidden bg-background">
    <aside
      id="desktop-navigation"
      class="hidden shrink-0 flex-col border-r border-border bg-card py-6 motion-safe:transition-[width,padding] motion-safe:duration-200 md:flex"
      :class="desktopNavigationCollapsed ? 'w-20 px-3' : 'w-64 px-5'"
    >
      <div
        class="flex items-center"
        :class="desktopNavigationCollapsed ? 'flex-col gap-3' : 'justify-between gap-3'"
      >
        <img
          v-if="desktopNavigationCollapsed"
          src="/logo/landline-symbol-color.svg"
          alt="Landline"
          class="h-9 w-auto"
        />
        <LandlineWordmark v-else class="w-36" />
        <Button
          type="button"
          :variant="ButtonVariant.LINK"
          :size="ButtonSize.ICON"
          :aria-label="
            t(desktopNavigationCollapsed ? 'navigation.expandMenu' : 'navigation.collapseMenu')
          "
          aria-controls="desktop-navigation"
          :aria-expanded="!desktopNavigationCollapsed"
          @click="toggleDesktopNavigation"
        >
          <svg
            aria-hidden="true"
            class="size-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <path
              :d="desktopNavigationCollapsed ? 'm9 6 6 6-6 6' : 'm15 6-6 6 6 6'"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </Button>
      </div>
      <AuthenticatedNavigation
        :collapsed="desktopNavigationCollapsed"
        :logout-disabled="loggingOut"
        @logout="logout"
      />
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header class="flex h-16 shrink-0 items-center border-b border-border bg-card px-5 md:hidden">
        <Button
          ref="menuButton"
          type="button"
          :variant="ButtonVariant.LINK"
          :size="ButtonSize.ICON"
          :aria-label="t('navigation.openMenu')"
          aria-controls="mobile-navigation"
          :aria-expanded="drawerOpen"
          @click="openDrawer"
        >
          <img src="/logo/landline-symbol-color.svg" alt="" aria-hidden="true" class="h-9 w-auto" />
        </Button>
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
        <div class="flex items-center">
          <h2 id="mobile-navigation-title" class="sr-only">
            {{ t("navigation.menu") }}
          </h2>
          <Button
            ref="closeButton"
            type="button"
            :variant="ButtonVariant.LINK"
            :size="ButtonSize.ICON"
            :aria-label="t('navigation.closeMenu')"
            @click="closeDrawer()"
          >
            <img
              src="/logo/landline-symbol-color.svg"
              alt=""
              aria-hidden="true"
              class="h-9 w-auto"
            />
          </Button>
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
