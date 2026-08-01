<script setup lang="ts">
// 登录页（静态原型）：纯展示无逻辑；颜色全用 daisyUI 语义色，随主题变化
</script>

<template>
  <!-- 全屏居中容器（daisyUI hero 官方结构）；不再强制 data-theme，由右上角暗夜切换控制 -->
  <div class="hero min-h-screen bg-base-200">
    <!-- 暗夜模式切换（fixed 固定右上角） -->
    <div class="fixed right-6 top-6">
      <!-- 明暗切换（swap + theme-controller） -->
      <label class="swap swap-rotate">
        <!-- 控制明暗的隐藏复选框：勾选切到 dark（暗），默认主题为亮（light）；dark 为 daisyUI 默认启用主题 -->
        <input type="checkbox" class="theme-controller" value="dark" />
        <!-- 太阳（亮色状态） -->
        <svg
          class="swap-off h-6 w-6 fill-current"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
        >
          <path
            d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z"
          />
        </svg>
        <!-- 月亮（暗色状态） -->
        <svg
          class="swap-on h-6 w-6 fill-current"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
        >
          <path
            d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z"
          />
        </svg>
      </label>
    </div>

    <div class="hero-content w-full max-w-sm flex-col items-center px-4">
      <!-- 品牌（简洁文字版） -->
      <div class="text-center">
        <h1 class="text-2xl font-semibold tracking-tight text-base-content">欢迎回来</h1>
        <p class="mt-1 text-sm text-base-content/60">登录以继续你的成长旅程</p>
      </div>

      <!-- 登录卡片 -->
      <div class="card w-full bg-base-100 shadow-lg">
        <div class="card-body gap-3">
          <!-- 邮箱输入（仅支持邮箱登录，label 作容器，官方语法） -->
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

          <!-- 主登录按钮（页面唯一 primary 色） -->
          <button type="button" class="btn btn-primary btn-block btn-circle">登 录</button>

          <!-- 第三方登录占位（接入 SSO 时替换为官方 logo） -->
          <div class="divider text-xs text-base-content/50">或</div>
          <div class="grid grid-cols-2 gap-3">
            <!-- QQ 登录（品牌蓝，官方图标） -->
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

          <!-- 注册引导 -->
          <p class="mt-1 text-center text-sm text-base-content/60">
            还没有账号？
            <button class="btn btn-link">立即注册</button>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
