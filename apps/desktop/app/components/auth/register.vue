<script setup lang="ts">
// 注册表单（静态原型）：纯展示无逻辑；颜色全用 daisyUI 语义色，随主题变化
// 切换登录表单：由父组件（认证页）监听 switch-to-login 事件
defineEmits<{ switchToLogin: [] }>()
</script>

<template>
  <!-- 内容容器（daisyUI hero-content 官方结构，max-w-sm 限宽居中） -->
  <div class="hero-content w-full max-w-sm flex-col items-center px-4">
    <!-- 品牌区（简洁文字版） -->
    <div class="text-center">
      <h1 class="text-2xl font-semibold tracking-tight text-base-content">创建账号</h1>
      <p class="mt-1 text-sm text-base-content/60">注册以开始你的成长旅程</p>
    </div>

    <!-- 注册卡片 -->
    <div class="card w-full bg-base-100 shadow-lg">
      <div class="card-body gap-3">
        <!-- 邮箱输入（仅支持邮箱注册，label 作容器，官方语法） -->
        <label class="input validator">
          <svg class="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <g
              stroke-linejoin="round"
              stroke-linecap="round"
              stroke-width="2.5"
              fill="none"
              stroke="currentColor"
            >
              <rect width="20" height="16" x="2" y="4" rx="2"></rect>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
            </g>
          </svg>
          <input type="email" placeholder="请输入邮箱" required />
        </label>
        <div class="validator-hint hidden">请输入有效的邮箱地址</div>

        <!-- 密码输入（validator 校验，右侧眼睛为"显示密码"预留位） -->
        <label class="input validator">
          <svg class="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <g
              stroke-linejoin="round"
              stroke-linecap="round"
              stroke-width="2.5"
              fill="none"
              stroke="currentColor"
            >
              <path
                d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"
              ></path>
              <circle cx="16.5" cy="7.5" r=".5" fill="currentColor"></circle>
            </g>
          </svg>
          <input type="password" required placeholder="请输入密码" minlength="8" />
        </label>
        <p class="validator-hint hidden">密码至少 8 位</p>

        <!-- 主注册按钮（页面唯一 primary 色） -->
        <button type="button" class="btn btn-primary btn-block btn-circle">注 册</button>

        <!-- 第三方登录占位（接入 SSO 时替换为官方 logo） -->
        <div class="divider text-xs text-base-content/50">或</div>
        <div class="grid grid-cols-2 gap-3">
          <!-- QQ 注册（品牌蓝，官方图标） -->
          <button type="button" class="btn btn-dash btn-info btn-circle btn-block">
            <!-- 官方 QQ 图标（assets/icons/qq.svg） -->
            <img src="~/assets/icons/qq.svg" alt="QQ logo" class="h-6 w-6" />
            QQ 登录
          </button>
          <button type="button" class="btn btn-dash btn-success btn-circle btn-block">
            <!-- 官方微信图标（assets/icons/微信.svg） -->
            <img src="~/assets/icons/微信.svg" alt="微信 logo" class="h-6 w-6" />
            微信登录
          </button>
        </div>

        <!-- 登录引导（切到登录表单） -->
        <p class="mt-1 text-center text-sm text-base-content/60">
          已有账号？
          <button class="btn btn-link" @click="$emit('switchToLogin')">立即登录</button>
        </p>
      </div>
    </div>
  </div>
</template>
