<template>
  <PublicShell
    ><div class="access-layout">
      <aside class="access-intro" aria-label="Sua preparação">
        <p class="contest-kicker">SEU ESPAÇO DE PREPARAÇÃO</p>
        <h2>Um objetivo.<br />Um passo de cada vez.</h2>
        <p>
          Organize seus estudos, pratique com direção e acompanhe sua evolução.
        </p>
        <ul>
          <li><ContestIcon name="target" />Encontre seu concurso</li>
          <li><ContestIcon name="questions" />Aprenda resolvendo questões</li>
          <li><ContestIcon name="chart" />Veja seu progresso real</li>
        </ul>
        <div class="access-note">
          <span class="contest-kicker">NO SEU RITMO</span>
          <p>Constância vale mais que pressa.</p>
        </div>
      </aside>
      <slot /></div
  ></PublicShell>
</template>
