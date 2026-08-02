<script setup lang="ts">
import { ref } from "vue";
import { buttonBaseClasses, sizeClasses, variantClasses } from "./button-config";
import { ButtonSize } from "./button-size";
import { ButtonVariant } from "./button-variant";

export type ButtonProps = {
  disabled?: boolean;
  loading?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

const {
  disabled = false,
  loading = false,
  size = ButtonSize.DEFAULT,
  variant = ButtonVariant.PRIMARY,
} = defineProps<ButtonProps>();
const button = ref<HTMLButtonElement | null>(null);

defineExpose({ focus: () => button.value?.focus() });
</script>

<template>
  <button
    ref="button"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
    :class="[buttonBaseClasses, sizeClasses[size], variantClasses[variant]]"
  >
    <svg
      v-if="loading"
      aria-hidden="true"
      class="size-4 shrink-0 motion-safe:animate-spin"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" opacity="0.3" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
      />
    </svg>
    <slot />
  </button>
</template>
