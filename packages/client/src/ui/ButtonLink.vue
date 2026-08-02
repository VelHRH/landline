<script setup lang="ts">
import {
  RouterLink,
  type RouteLocationAsPathGeneric,
  type RouteLocationAsRelativeGeneric,
} from "vue-router";
import { buttonBaseClasses, sizeClasses, variantClasses } from "./button/button-config.ts";
import { ButtonSize } from "./button/button-size";
import { ButtonVariant } from "./button/button-variant";

type ButtonLinkProps = {
  size?: ButtonSize;
  to: string | RouteLocationAsRelativeGeneric | RouteLocationAsPathGeneric;
  variant?: ButtonVariant;
};

const {
  size = ButtonSize.DEFAULT,
  to,
  variant = ButtonVariant.LINK,
} = defineProps<ButtonLinkProps>();
</script>

<template>
  <RouterLink :to="to" :class="[buttonBaseClasses, sizeClasses[size], variantClasses[variant]]">
    <slot />
  </RouterLink>
</template>
