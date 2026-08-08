<script setup lang="ts">
// 技能页：技能列表骨架（页头 + 空状态）
</script>

<template>
  <div class="p-6">
    <!-- 页头：标题 + 新建操作占位 -->
    <div class="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">技能</h1>
        <p class="mt-1 text-sm text-base-content/50">为智能体编排可复用的技能</p>
      </div>
      <button type="button" class="btn btn-primary">新建技能</button>
    </div>

    <!-- 空状态占位 -->
    <div class="card border border-base-300 bg-base-200">
      <div class="card-body items-center justify-center py-16 text-center">
        <p class="text-base-content/50">暂无技能，点击右上角创建你的第一个技能</p>
      </div>
    </div>
  </div>
</template>
