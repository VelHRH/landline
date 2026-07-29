<script setup lang="ts">
import { Gender } from "@landline/domain/user/enums";
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { RouteName, routeName } from "@/router";
import CityTypeahead from "@/modules/city/CityTypeahead.vue";
import { useSessionStore } from "./session.store";
import Button from "@/ui/button/Button.vue";
import { ButtonVariant } from "@/ui/button/button-variant";
import Input from "@/ui/Input.vue";

enum AuthMode {
  Login = "login",
  Signup = "signup",
}

const genderOptions: ReadonlyArray<{ value: Gender; label: string }> = [
  { value: Gender.FEMALE, label: "Woman" },
  { value: Gender.MALE, label: "Man" },
  { value: Gender.NONBINARY, label: "Non-binary" },
];

const session = useSessionStore();
const router = useRouter();
const route = useRoute();

const mode = ref<AuthMode>(AuthMode.Login);
const email = ref("");
const password = ref("");
const dateOfBirth = ref("");
const gender = ref<Gender | "">("");
const interestedIn = ref<Gender[]>([]);
const cityId = ref<string | null>(null);
const error = ref<string | null>(null);
const pending = ref(false);

const toggleMode = () => {
  mode.value = mode.value === AuthMode.Login ? AuthMode.Signup : AuthMode.Login;
  error.value = null;
};

const toggleInterested = (value: Gender) => {
  interestedIn.value = interestedIn.value.includes(value)
    ? interestedIn.value.filter((entry) => entry !== value)
    : [...interestedIn.value, value];
};

const submit = async () => {
  if (pending.value) return;

  if (mode.value === AuthMode.Signup) {
    if (!dateOfBirth.value || gender.value === "" || interestedIn.value.length === 0 || !cityId.value) {
      error.value = "Fill in your date of birth, gender, who you're interested in, and your city";
      return;
    }
  }

  pending.value = true;
  error.value = null;

  const result =
    mode.value === AuthMode.Login
      ? await session.login(email.value, password.value)
      : await session.signUp({
          email: email.value,
          password: password.value,
          dateOfBirth: dateOfBirth.value,
          gender: gender.value as Gender,
          interestedIn: interestedIn.value,
          cityId: cityId.value as string,
        });

  pending.value = false;
  if (result.ok) {
    const redirect = route.query.redirect;
    await router.replace(
      typeof redirect === "string" ? redirect : { name: routeName(RouteName.CHATS) },
    );
  } else {
    error.value = result.message;
  }
};
</script>

<template>
  <main class="flex min-h-dvh items-center justify-center px-6 py-16">
    <form class="w-full max-w-sm" novalidate @submit.prevent="submit">
      <h1 class="font-medium">
        {{ mode === AuthMode.Login ? "Log in" : "Sign up" }}
      </h1>
      <p class="mt-2 text-caption text-muted-foreground">
        {{ mode === AuthMode.Login ? "The night is waiting." : "One account, every night." }}
      </p>

      <div class="mt-10 space-y-5">
        <Input v-model="email" label="Email" type="email" autocomplete="email" required />
        <Input
          v-model="password"
          label="Password"
          type="password"
          :autocomplete="mode === AuthMode.Login ? 'current-password' : 'new-password'"
          required
        />

        <template v-if="mode === AuthMode.Signup">
          <Input
            v-model="dateOfBirth"
            label="Date of birth"
            type="date"
            autocomplete="bday"
            required
          />

          <label class="block">
            <span class="mb-2 block text-caption text-muted-foreground">Gender</span>
            <select
              v-model="gender"
              required
              class="w-full rounded-md border border-input bg-card px-3.5 py-2.5 text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
            >
              <option value="" disabled>Select…</option>
              <option v-for="option in genderOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>

          <fieldset>
            <legend class="mb-2 block text-caption text-muted-foreground">Interested in</legend>
            <div class="flex flex-wrap gap-4">
              <label
                v-for="option in genderOptions"
                :key="option.value"
                class="flex items-center gap-2 text-foreground"
              >
                <input
                  type="checkbox"
                  :checked="interestedIn.includes(option.value)"
                  class="rounded border-input text-primary focus:ring-2 focus:ring-ring/40"
                  @change="toggleInterested(option.value)"
                />
                {{ option.label }}
              </label>
            </div>
          </fieldset>

          <CityTypeahead v-model="cityId" />
        </template>
      </div>

      <p v-if="error" role="alert" class="mt-4 text-caption text-destructive">{{ error }}</p>

      <Button type="submit" :disabled="pending" class="mt-8 w-full">
        {{ mode === AuthMode.Login ? "Log in" : "Create account" }}
      </Button>

      <Button
        type="button"
        :variant="ButtonVariant.LINK"
        class="mt-6 block w-full text-center"
        @click="toggleMode"
      >
        {{
          mode === AuthMode.Login ? "No account yet? Sign up" : "Already have an account? Log in"
        }}
      </Button>
    </form>
  </main>
</template>
