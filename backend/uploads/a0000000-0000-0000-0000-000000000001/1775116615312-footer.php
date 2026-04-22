        </main>
    </div>

    <?php
    // Determina il ruolo utente per il menu mobile
    $userRole = $user['ruolo_nome'] ?? $user['ruolo'] ?? '';
    $isTecnico = ($userRole === 'tecnico');
    $isTecnicoMagazzino = ($userRole === 'tecnico_magazzino');
    $isMagazzino = ($userRole === 'magazzino');
    $isAdminOrCommerciale = in_array($userRole, ['admin', 'commerciale']);
    ?>

    <!-- Bottom Navigation (Mobile Only) -->
    <nav class="bottom-nav" id="bottomNav">
        <?php if ($isTecnico): ?>
            <!-- Menu Tecnico -->
            <a href="<?= APP_URL ?>?page=tecnico" class="bottom-nav-item <?= ($page ?? '') === 'tecnico' ? 'active' : '' ?>">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"/></svg>
                <span>Interventi</span>
            </a>
            <a href="<?= APP_URL ?>?page=profilo" class="bottom-nav-item <?= ($page ?? '') === 'profilo' ? 'active' : '' ?>">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>
                <span>Profilo</span>
            </a>
            <a href="<?= APP_URL ?>?page=logout" class="bottom-nav-item">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"/></svg>
                <span>Esci</span>
            </a>

        <?php elseif ($isTecnicoMagazzino): ?>
            <!-- Menu Tecnico/Magazzino -->
            <a href="<?= APP_URL ?>?page=tecnico" class="bottom-nav-item <?= ($page ?? '') === 'tecnico' ? 'active' : '' ?>">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"/></svg>
                <span>Interventi</span>
            </a>
            <a href="<?= APP_URL ?>?page=magazzino" class="bottom-nav-item <?= ($page ?? '') === 'magazzino' ? 'active' : '' ?>">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                <span>Magazzino</span>
            </a>
            <a href="<?= APP_URL ?>?page=profilo" class="bottom-nav-item <?= ($page ?? '') === 'profilo' ? 'active' : '' ?>">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>
                <span>Profilo</span>
            </a>
            <a href="<?= APP_URL ?>?page=logout" class="bottom-nav-item">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"/></svg>
                <span>Esci</span>
            </a>

        <?php elseif ($isMagazzino): ?>
            <!-- Menu Magazzino -->
            <a href="<?= APP_URL ?>?page=magazzino" class="bottom-nav-item <?= ($page ?? '') === 'magazzino' ? 'active' : '' ?>">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                <span>Magazzino</span>
            </a>
            <a href="<?= APP_URL ?>?page=automezzi" class="bottom-nav-item <?= ($page ?? '') === 'automezzi' ? 'active' : '' ?>">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/></svg>
                <span>Automezzi</span>
            </a>
            <a href="<?= APP_URL ?>?page=strumenti" class="bottom-nav-item <?= ($page ?? '') === 'strumenti' ? 'active' : '' ?>">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"/></svg>
                <span>Strumenti</span>
            </a>
            <button type="button" class="bottom-nav-item bottom-nav-more" id="moreMenuBtn">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/></svg>
                <span>Altro</span>
            </button>

        <?php else: ?>
            <!-- Menu Admin/Commerciale -->
            <a href="<?= APP_URL ?>?page=dashboard" class="bottom-nav-item <?= ($page ?? '') === 'dashboard' ? 'active' : '' ?>">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                <span>Home</span>
            </a>
            <a href="<?= APP_URL ?>?page=interventi" class="bottom-nav-item <?= ($page ?? '') === 'interventi' ? 'active' : '' ?>">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"/></svg>
                <span>Interventi</span>
            </a>
            <a href="<?= APP_URL ?>?page=calendario" class="bottom-nav-item <?= ($page ?? '') === 'calendario' ? 'active' : '' ?>">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/></svg>
                <span>Calendario</span>
            </a>
            <a href="<?= APP_URL ?>?page=clienti" class="bottom-nav-item <?= ($page ?? '') === 'clienti' ? 'active' : '' ?>">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg>
                <span>Clienti</span>
            </a>
            <button type="button" class="bottom-nav-item bottom-nav-more" id="moreMenuBtn">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/></svg>
                <span>Menu</span>
            </button>
        <?php endif; ?>
    </nav>

    <?php if ($isMagazzino): ?>
    <!-- More Menu per Magazzino -->
    <div class="more-menu-overlay" id="moreMenuOverlay"></div>
    <div class="more-menu" id="moreMenu">
        <a href="<?= APP_URL ?>?page=profilo" class="more-menu-item">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>
            <span>Profilo</span>
        </a>
        <div class="more-menu-divider"></div>
        <a href="<?= APP_URL ?>?page=logout" class="more-menu-item more-menu-logout">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"/></svg>
            <span>Esci</span>
        </a>
    </div>
    <?php endif; ?>

    <?php if ($isAdminOrCommerciale): ?>
    <!-- More Menu per Admin/Commerciale -->
    <div class="more-menu-overlay" id="moreMenuOverlay"></div>
    <div class="more-menu" id="moreMenu">
        <a href="<?= APP_URL ?>?page=leads" class="more-menu-item">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z"/></svg>
            <span>Lead</span>
        </a>
        <a href="<?= APP_URL ?>?page=ordini" class="more-menu-item">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
            <span>Ordini</span>
        </a>
        <a href="<?= APP_URL ?>?page=preventivi" class="more-menu-item">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
            <span>Preventivi</span>
        </a>
        <a href="<?= APP_URL ?>?page=magazzino" class="more-menu-item">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
            <span>Magazzino</span>
        </a>
        <a href="<?= APP_URL ?>?page=automezzi" class="more-menu-item">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/></svg>
            <span>Automezzi</span>
        </a>
        <div class="more-menu-divider"></div>
        <a href="<?= APP_URL ?>?page=strumenti" class="more-menu-item">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"/></svg>
            <span>Strumenti</span>
        </a>
        <a href="<?= APP_URL ?>?page=fgas" class="more-menu-item">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 3v18m0-18l-3 3m3-3l3 3m-3 15l-3-3m3 3l3-3M3 12h18M3 12l3-3m-3 3l3 3m15-3l-3-3m3 3l-3 3"/></svg>
            <span>F-Gas</span>
        </a>
        <a href="<?= APP_URL ?>?page=conformita" class="more-menu-item">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span>Conformità</span>
        </a>
        <a href="<?= APP_URL ?>?page=libretti" class="more-menu-item">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
            <span>Libretto impianti</span>
        </a>
        <div class="more-menu-divider"></div>
        <?php if (Auth::isAdmin()): ?>
        <a href="<?= APP_URL ?>?page=tecnico" class="more-menu-item">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"/></svg>
            <span>Area Tecnico</span>
        </a>
        <a href="<?= APP_URL ?>?page=impostazioni" class="more-menu-item">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <span>Impostazioni</span>
        </a>
        <?php endif; ?>
        <a href="<?= APP_URL ?>?page=profilo" class="more-menu-item">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>
            <span>Profilo</span>
        </a>
        <div class="more-menu-divider"></div>
        <a href="<?= APP_URL ?>?page=logout" class="more-menu-item more-menu-logout">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"/></svg>
            <span>Esci</span>
        </a>
    </div>
    <?php endif; ?>

    <!-- Stile per logout nel menu -->
    <style>
    .more-menu-logout {
        color: #dc2626 !important;
    }
    .more-menu-logout svg {
        color: #dc2626 !important;
    }
    .more-menu-logout:hover {
        background: #fef2f2 !important;
    }
    </style>

    <!-- Bottom Nav Script -->
    <script>
    (function() {
        const moreBtn = document.getElementById('moreMenuBtn');
        const moreMenu = document.getElementById('moreMenu');
        const moreOverlay = document.getElementById('moreMenuOverlay');

        if (moreBtn && moreMenu && moreOverlay) {
            moreBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                moreMenu.classList.toggle('active');
                moreOverlay.classList.toggle('active');
            });

            moreOverlay.addEventListener('click', function() {
                moreMenu.classList.remove('active');
                moreOverlay.classList.remove('active');
            });

            moreMenu.querySelectorAll('.more-menu-item').forEach(function(item) {
                item.addEventListener('click', function() {
                    moreMenu.classList.remove('active');
                    moreOverlay.classList.remove('active');
                });
            });

            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    moreMenu.classList.remove('active');
                    moreOverlay.classList.remove('active');
                }
            });
        }

        window.addEventListener('resize', function() {
            if (window.innerWidth > 768 && moreMenu && moreOverlay) {
                moreMenu.classList.remove('active');
                moreOverlay.classList.remove('active');
            }
        });
    })();
    </script>

    <script src="<?= APP_URL ?>/assets/js/validation.js"></script>

    <?php if ($isAdminOrCommerciale): ?>
    <!-- Modal Notifiche Sopralluogo -->
    <div class="modal-overlay" id="modalNotificheSopralluogo">
        <div class="modal" style="max-width: 500px;">
            <div class="modal-header notifica-header-success">
                <h5 class="modal-title notifica-title-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zM8 1.918l-.797.161A4.002 4.002 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4.002 4.002 0 0 0-3.203-3.92L8 1.917z"/>
                    </svg>
                    <span id="notificaModalTitle">Sopralluoghi Completati</span>
                </h5>
                <button type="button" class="notifica-close-btn" onclick="closeNotificaModal()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="modal-body" id="notificheSopralluogoBody" style="padding: 0; max-height: 400px; overflow-y: auto;">
                <!-- Contenuto dinamico: lista notifiche -->
            </div>
            <div class="modal-footer notifica-footer">
                <button type="button" class="btn btn-secondary" onclick="dismissAllNotifiche()">
                    Chiudi tutto
                </button>
            </div>
        </div>
    </div>

    <!-- Modal Notifiche Interventi Iniziati -->
    <div class="modal-overlay" id="modalNotificheInterventi">
        <div class="modal" style="max-width: 500px;">
            <div class="modal-header notifica-header-intervento">
                <h5 class="modal-title notifica-title-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span id="notificaInterventiModalTitle">Interventi Iniziati</span>
                </h5>
                <button type="button" class="notifica-close-btn" onclick="closeNotificaInterventiModal()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="modal-body" id="notificheInterventiBody" style="padding: 0; max-height: 400px; overflow-y: auto;">
                <!-- Contenuto dinamico: lista notifiche -->
            </div>
            <div class="modal-footer notifica-footer">
                <button type="button" class="btn btn-secondary" onclick="dismissAllInterventiNotifiche()">
                    Chiudi tutto
                </button>
            </div>
        </div>
    </div>

    <!-- Modal Notifiche Interventi Chiusi -->
    <div class="modal-overlay" id="modalNotificheChiusi">
        <div class="modal" style="max-width: 500px;">
            <div class="modal-header notifica-header-chiuso">
                <h5 class="modal-title notifica-title-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                    </svg>
                    <span id="notificaChiusiModalTitle">Interventi Completati</span>
                </h5>
                <button type="button" class="notifica-close-btn" onclick="closeNotificaChiusiModal()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="modal-body" id="notificheChiusiBody" style="padding: 0; max-height: 400px; overflow-y: auto;">
                <!-- Contenuto dinamico: lista notifiche -->
            </div>
            <div class="modal-footer notifica-footer">
                <button type="button" class="btn btn-secondary" onclick="dismissAllChiusiNotifiche()">
                    Chiudi tutto
                </button>
            </div>
        </div>
    </div>

    <style>
    #modalNotificheSopralluogo .modal {
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .notifica-header-success {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
        border-radius: 12px 12px 0 0;
        padding: 16px 20px;
    }
    .notifica-title-white {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #ffffff !important;
        font-weight: 600;
        margin: 0;
    }
    .notifica-title-white svg {
        fill: #ffffff;
    }
    .notifica-close-btn {
        background: rgba(255,255,255,0.2);
        border: none;
        border-radius: 6px;
        padding: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
    }
    .notifica-close-btn:hover {
        background: rgba(255,255,255,0.3);
    }
    .notifica-footer {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        padding: 16px 20px;
        border-top: 1px solid var(--border);
    }

    /* Lista notifiche */
    .notifica-list {
        list-style: none;
        margin: 0;
        padding: 0;
    }
    .notifica-item {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        padding: 16px 20px;
        border-bottom: 1px solid var(--border);
        transition: background 0.2s;
    }
    .notifica-item:last-child {
        border-bottom: none;
    }
    .notifica-item:hover {
        background: var(--bg-secondary);
    }
    .notifica-item-icon {
        width: 44px;
        height: 44px;
        background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }
    .notifica-item-icon svg {
        color: #059669;
        width: 22px;
        height: 22px;
    }
    .notifica-item-content {
        flex: 1;
        min-width: 0;
    }
    .notifica-item-title {
        font-weight: 600;
        font-size: 14px;
        color: var(--text-dark);
        margin-bottom: 4px;
    }
    .notifica-item-message {
        font-size: 13px;
        color: var(--text-muted);
        margin-bottom: 8px;
        line-height: 1.4;
    }
    .notifica-item-date {
        font-size: 11px;
        color: var(--text-muted);
        opacity: 0.7;
    }
    .notifica-item-actions {
        display: flex;
        gap: 8px;
        flex-shrink: 0;
    }
    .notifica-btn-preventivo {
        padding: 8px 14px;
        background: var(--primary);
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
    }
    .notifica-btn-preventivo:hover {
        opacity: 0.9;
    }
    .notifica-btn-dismiss {
        padding: 8px 12px;
        background: var(--bg-secondary);
        color: var(--text-muted);
        border: 1px solid var(--border);
        border-radius: 6px;
        font-size: 12px;
        cursor: pointer;
    }
    .notifica-btn-dismiss:hover {
        background: var(--border);
    }
    .notifica-btn-rapporto {
        padding: 8px 10px;
        background: #e0f2fe;
        color: #0369a1;
        border: none;
        border-radius: 6px;
        font-size: 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .notifica-btn-rapporto:hover {
        background: #bae6fd;
    }

    /* Empty state */
    .notifica-empty {
        padding: 40px 20px;
        text-align: center;
        color: var(--text-muted);
    }

    /* Intervento iniziato notification styles */
    .notifica-header-intervento {
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%) !important;
        border-radius: 12px 12px 0 0;
        padding: 16px 20px;
    }
    .notifica-icon-intervento {
        width: 44px;
        height: 44px;
        background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%) !important;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }
    .notifica-icon-intervento svg {
        color: #1d4ed8 !important;
        width: 22px;
        height: 22px;
    }
    .notifica-btn-visualizza {
        padding: 8px 14px;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
    }
    .notifica-btn-visualizza:hover {
        background: #2563eb;
    }

    /* Intervento chiuso notification styles */
    .notifica-header-chiuso {
        background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%) !important;
        border-radius: 12px 12px 0 0;
        padding: 16px 20px;
    }
    .notifica-icon-chiuso {
        width: 44px;
        height: 44px;
        background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%) !important;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }
    .notifica-icon-chiuso svg {
        color: #16a34a !important;
        width: 22px;
        height: 22px;
    }
    .notifica-btn-rapporto-view {
        padding: 8px 14px;
        background: #22c55e;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
    }
    .notifica-btn-rapporto-view:hover {
        background: #16a34a;
    }
    </style>

    <!-- Script Notifiche -->
    <script>
    (function() {
        let notificheList = [];
        let notificheInterventiList = [];
        let notificheChiusiList = [];

        // Controlla notifiche non lette al caricamento
        async function checkNotifiche() {
            try {
                const response = await fetch('<?= APP_URL ?>?api=notifiche&action=unread');
                const data = await response.json();

                console.log('Notifiche response:', data);

                if (data.success && data.data && data.data.length > 0) {
                    // Filtra notifiche di tipo sopralluogo_completato
                    notificheList = data.data.filter(n => n.tipo === 'sopralluogo_completato');

                    // Filtra notifiche di tipo intervento_iniziato
                    notificheInterventiList = data.data.filter(n => n.tipo === 'intervento_iniziato');

                    // Filtra notifiche di tipo intervento_chiuso
                    notificheChiusiList = data.data.filter(n => n.tipo === 'intervento_chiuso');

                    console.log('Notifiche sopralluogo:', notificheList);
                    console.log('Notifiche interventi iniziati:', notificheInterventiList);
                    console.log('Notifiche interventi chiusi:', notificheChiusiList);

                    // Mostra le notifiche in ordine di priorità
                    if (notificheList.length > 0) {
                        showNotificheModal();
                    } else if (notificheChiusiList.length > 0) {
                        showNotificheChiusiModal();
                    } else if (notificheInterventiList.length > 0) {
                        showNotificheInterventiModal();
                    }
                }
            } catch (error) {
                console.error('Errore caricamento notifiche:', error);
            }
        }

        function showNotificheModal() {
            const body = document.getElementById('notificheSopralluogoBody');
            const title = document.getElementById('notificaModalTitle');

            // Aggiorna titolo con conteggio
            title.textContent = notificheList.length === 1
                ? 'Sopralluogo Completato'
                : `Sopralluoghi Completati (${notificheList.length})`;

            // Genera lista notifiche
            let html = '<ul class="notifica-list">';

            notificheList.forEach((notifica, index) => {
                // Parse azione_params if string
                if (typeof notifica.azione_params === 'string') {
                    try {
                        notifica.azione_params = JSON.parse(notifica.azione_params);
                    } catch(e) {
                        notifica.azione_params = {};
                    }
                }

                html += `
                    <li class="notifica-item" data-id="${notifica.id}" data-index="${index}">
                        <div class="notifica-item-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                            </svg>
                        </div>
                        <div class="notifica-item-content">
                            <div class="notifica-item-title">${notifica.titolo || 'Sopralluogo completato'}</div>
                            <div class="notifica-item-message">${notifica.messaggio || ''}</div>
                            <div class="notifica-item-date">${notifica.data_formattata || ''}</div>
                        </div>
                        <div class="notifica-item-actions">
                            <button class="notifica-btn-rapporto" onclick="visualizzaRapporto(${index})" title="Visualizza rapporto sopralluogo">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                </svg>
                            </button>
                            <button class="notifica-btn-preventivo" onclick="generaPreventivo(${index})">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                </svg>
                                Preventivo
                            </button>
                            <button class="notifica-btn-dismiss" onclick="dismissSingleNotifica(${index})">
                                Ignora
                            </button>
                        </div>
                    </li>
                `;
            });

            html += '</ul>';
            body.innerHTML = html;

            // Apri modal
            document.getElementById('modalNotificheSopralluogo').classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        window.closeNotificaModal = function() {
            document.getElementById('modalNotificheSopralluogo').classList.remove('active');
            document.body.style.overflow = '';
        };

        window.visualizzaRapporto = function(index) {
            const notifica = notificheList[index];
            if (!notifica) return;

            const params = notifica.azione_params || {};
            const interventoId = params.intervento_id || params.sopralluogo_id || '';

            if (interventoId) {
                // Apri rapporto in nuova finestra
                window.open('<?= APP_URL ?>?page=rapporto&id=' + interventoId, '_blank');
            }
        };

        window.generaPreventivo = async function(index) {
            const notifica = notificheList[index];
            if (!notifica) return;

            // Marca come letta
            await markAsRead(notifica.id);

            // Chiudi modal
            closeNotificaModal();

            // Apri pagina preventivi con parametri
            const params = notifica.azione_params || {};
            const url = new URLSearchParams({
                page: 'preventivi',
                action: 'nuovo',
                from_sopralluogo: params.intervento_id || params.sopralluogo_id || '',
                cliente_id: params.cliente_id || '',
                cliente_nome: params.cliente_nome || '',
                indirizzo: params.indirizzo || ''
            });

            window.location.href = '<?= APP_URL ?>?' + url.toString();
        };

        window.dismissSingleNotifica = async function(index) {
            const notifica = notificheList[index];
            if (!notifica) return;

            // Marca come letta
            await markAsRead(notifica.id);

            // Rimuovi dalla lista
            notificheList.splice(index, 1);

            // Se non ci sono più notifiche, chiudi modal
            if (notificheList.length === 0) {
                closeNotificaModal();
            } else {
                // Aggiorna la vista
                showNotificheModal();
            }
        };

        window.dismissAllNotifiche = async function() {
            // Marca tutte come lette
            for (const notifica of notificheList) {
                await markAsRead(notifica.id);
            }

            notificheList = [];
            closeNotificaModal();

            // Dopo aver chiuso le notifiche sopralluogo, mostra le successive
            if (notificheChiusiList.length > 0) {
                setTimeout(() => showNotificheChiusiModal(), 300);
            } else if (notificheInterventiList.length > 0) {
                setTimeout(() => showNotificheInterventiModal(), 300);
            }
        };

        // ==================== Notifiche Interventi Iniziati ====================
        function showNotificheInterventiModal() {
            const body = document.getElementById('notificheInterventiBody');
            const title = document.getElementById('notificaInterventiModalTitle');

            // Aggiorna titolo con conteggio
            title.textContent = notificheInterventiList.length === 1
                ? 'Intervento Iniziato'
                : `Interventi Iniziati (${notificheInterventiList.length})`;

            // Genera lista notifiche
            let html = '<ul class="notifica-list">';

            notificheInterventiList.forEach((notifica, index) => {
                // Parse azione_params if string
                if (typeof notifica.azione_params === 'string') {
                    try {
                        notifica.azione_params = JSON.parse(notifica.azione_params);
                    } catch(e) {
                        notifica.azione_params = {};
                    }
                }

                html += `
                    <li class="notifica-item" data-id="${notifica.id}" data-index="${index}">
                        <div class="notifica-item-icon notifica-icon-intervento">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                        <div class="notifica-item-content">
                            <div class="notifica-item-title">${notifica.titolo || 'Intervento iniziato'}</div>
                            <div class="notifica-item-message">${notifica.messaggio || ''}</div>
                            <div class="notifica-item-date">${notifica.data_formattata || ''}</div>
                        </div>
                        <div class="notifica-item-actions">
                            <button class="notifica-btn-visualizza" onclick="visualizzaIntervento(${index})">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                </svg>
                                Visualizza
                            </button>
                            <button class="notifica-btn-dismiss" onclick="dismissSingleInterventoNotifica(${index})">
                                OK
                            </button>
                        </div>
                    </li>
                `;
            });

            html += '</ul>';
            body.innerHTML = html;

            // Apri modal
            document.getElementById('modalNotificheInterventi').classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        window.closeNotificaInterventiModal = function() {
            document.getElementById('modalNotificheInterventi').classList.remove('active');
            document.body.style.overflow = '';
        };

        window.visualizzaIntervento = async function(index) {
            const notifica = notificheInterventiList[index];
            if (!notifica) return;

            // Marca come letta
            await markAsRead(notifica.id);

            const params = notifica.azione_params || {};
            const interventoId = params.intervento_id || '';

            if (interventoId) {
                // Chiudi modal e vai a intervento
                closeNotificaInterventiModal();
                window.location.href = '<?= APP_URL ?>?page=interventi&id=' + interventoId;
            }
        };

        window.dismissSingleInterventoNotifica = async function(index) {
            const notifica = notificheInterventiList[index];
            if (!notifica) return;

            // Marca come letta
            await markAsRead(notifica.id);

            // Rimuovi dalla lista
            notificheInterventiList.splice(index, 1);

            // Se non ci sono più notifiche, chiudi modal
            if (notificheInterventiList.length === 0) {
                closeNotificaInterventiModal();
            } else {
                // Aggiorna la vista
                showNotificheInterventiModal();
            }
        };

        window.dismissAllInterventiNotifiche = async function() {
            // Marca tutte come lette
            for (const notifica of notificheInterventiList) {
                await markAsRead(notifica.id);
            }

            notificheInterventiList = [];
            closeNotificaInterventiModal();
        };

        // ==================== Notifiche Interventi Chiusi ====================
        function showNotificheChiusiModal() {
            const body = document.getElementById('notificheChiusiBody');
            const title = document.getElementById('notificaChiusiModalTitle');

            // Aggiorna titolo con conteggio
            title.textContent = notificheChiusiList.length === 1
                ? 'Intervento Completato'
                : `Interventi Completati (${notificheChiusiList.length})`;

            // Genera lista notifiche
            let html = '<ul class="notifica-list">';

            notificheChiusiList.forEach((notifica, index) => {
                // Parse azione_params if string
                if (typeof notifica.azione_params === 'string') {
                    try {
                        notifica.azione_params = JSON.parse(notifica.azione_params);
                    } catch(e) {
                        notifica.azione_params = {};
                    }
                }

                html += `
                    <li class="notifica-item" data-id="${notifica.id}" data-index="${index}">
                        <div class="notifica-item-icon notifica-icon-chiuso">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                            </svg>
                        </div>
                        <div class="notifica-item-content">
                            <div class="notifica-item-title">${notifica.titolo || 'Intervento completato'}</div>
                            <div class="notifica-item-message">${notifica.messaggio || ''}</div>
                            <div class="notifica-item-date">${notifica.data_formattata || ''}</div>
                        </div>
                        <div class="notifica-item-actions">
                            <button class="notifica-btn-rapporto-view" onclick="visualizzaRapportoChiuso(${index})" title="Visualizza rapporto">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                </svg>
                                Rapporto
                            </button>
                            <button class="notifica-btn-dismiss" onclick="dismissSingleChiusoNotifica(${index})">
                                OK
                            </button>
                        </div>
                    </li>
                `;
            });

            html += '</ul>';
            body.innerHTML = html;

            // Apri modal
            document.getElementById('modalNotificheChiusi').classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        window.closeNotificaChiusiModal = function() {
            document.getElementById('modalNotificheChiusi').classList.remove('active');
            document.body.style.overflow = '';
        };

        window.visualizzaRapportoChiuso = async function(index) {
            const notifica = notificheChiusiList[index];
            if (!notifica) return;

            // Marca come letta
            await markAsRead(notifica.id);

            const params = notifica.azione_params || {};
            const interventoId = params.intervento_id || '';

            if (interventoId) {
                // Chiudi modal e vai al rapporto
                closeNotificaChiusiModal();
                window.location.href = '<?= APP_URL ?>?page=rapporto&id=' + interventoId;
            }
        };

        window.dismissSingleChiusoNotifica = async function(index) {
            const notifica = notificheChiusiList[index];
            if (!notifica) return;

            // Marca come letta
            await markAsRead(notifica.id);

            // Rimuovi dalla lista
            notificheChiusiList.splice(index, 1);

            // Se non ci sono più notifiche, chiudi modal
            if (notificheChiusiList.length === 0) {
                closeNotificaChiusiModal();
                // Mostra le notifiche interventi iniziati se presenti
                if (notificheInterventiList.length > 0) {
                    setTimeout(() => showNotificheInterventiModal(), 300);
                }
            } else {
                // Aggiorna la vista
                showNotificheChiusiModal();
            }
        };

        window.dismissAllChiusiNotifiche = async function() {
            // Marca tutte come lette
            for (const notifica of notificheChiusiList) {
                await markAsRead(notifica.id);
            }

            notificheChiusiList = [];
            closeNotificaChiusiModal();

            // Mostra le notifiche interventi iniziati se presenti
            if (notificheInterventiList.length > 0) {
                setTimeout(() => showNotificheInterventiModal(), 300);
            }
        };

        async function markAsRead(id) {
            try {
                await fetch('<?= APP_URL ?>?api=notifiche&action=mark-read&id=' + id);
            } catch (error) {
                console.error('Errore marcatura notifica:', error);
            }
        }

        // Avvia controllo notifiche dopo il caricamento della pagina
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => setTimeout(checkNotifiche, 1000));
        } else {
            setTimeout(checkNotifiche, 1000);
        }
    })();
    </script>

    <?php if (Auth::isAdmin()): ?>
    <!-- Modal Alert Compleanno -->
    <div class="modal-overlay" id="modalBirthdayAlert">
        <div class="modal" style="max-width: 450px;">
            <div class="modal-header birthday-header">
                <h5 class="modal-title birthday-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/>
                        <path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/>
                        <path d="M2 21h20"/>
                        <path d="M7 8v2"/>
                        <path d="M12 8v2"/>
                        <path d="M17 8v2"/>
                        <path d="M7 4h.01"/>
                        <path d="M12 4h.01"/>
                        <path d="M17 4h.01"/>
                    </svg>
                    <span id="birthdayModalTitle">Compleanno Oggi!</span>
                </h5>
                <button type="button" class="birthday-close-btn" onclick="closeBirthdayModal()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="modal-body birthday-body" id="birthdayModalBody">
                <!-- Contenuto dinamico -->
            </div>
            <div class="modal-footer birthday-footer">
                <button type="button" class="btn btn-primary birthday-dismiss-btn" onclick="dismissBirthdayAlert()">
                    Ho capito, grazie!
                </button>
            </div>
        </div>
    </div>

    <style>
    /* Birthday Modal Styles */
    #modalBirthdayAlert .modal {
        border-radius: 16px;
        box-shadow: 0 25px 80px rgba(0,0,0,0.25);
        overflow: hidden;
    }
    .birthday-header {
        background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #1d4ed8 100%) !important;
        padding: 18px 22px;
        position: relative;
        overflow: hidden;
    }
    .birthday-header::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(circle, rgba(255,255,255,0.15) 10%, transparent 40%);
        animation: birthdayShimmer 3s linear infinite;
    }
    @keyframes birthdayShimmer {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    .birthday-title {
        display: flex;
        align-items: center;
        gap: 12px;
        color: #ffffff !important;
        font-weight: 700;
        font-size: 18px;
        margin: 0;
        position: relative;
        z-index: 1;
    }
    .birthday-title svg {
        animation: birthdayCake 1s ease-in-out infinite alternate;
    }
    @keyframes birthdayCake {
        0% { transform: scale(1) rotate(-5deg); }
        100% { transform: scale(1.1) rotate(5deg); }
    }
    .birthday-close-btn {
        background: rgba(255,255,255,0.25);
        border: none;
        border-radius: 8px;
        padding: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        position: relative;
        z-index: 1;
    }
    .birthday-close-btn:hover {
        background: rgba(255,255,255,0.4);
    }
    .birthday-body {
        padding: 24px;
        text-align: center;
        background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%);
    }
    .birthday-person {
        margin-bottom: 20px;
        padding: 16px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 15px rgba(59, 130, 246, 0.15);
        border: 2px solid #bfdbfe;
    }
    .birthday-person:last-child {
        margin-bottom: 0;
    }
    .birthday-avatar {
        width: 70px;
        height: 70px;
        background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 12px;
        font-size: 28px;
        font-weight: 700;
        color: #1d4ed8;
        border: 3px solid #93c5fd;
    }
    .birthday-name {
        font-size: 20px;
        font-weight: 700;
        color: #1e40af;
        margin-bottom: 4px;
    }
    .birthday-age {
        font-size: 14px;
        color: #2563eb;
        font-weight: 500;
    }
    .birthday-message {
        margin-top: 16px;
        padding: 12px 16px;
        background: #eff6ff;
        border-radius: 8px;
        font-size: 14px;
        color: #1e40af;
        line-height: 1.5;
    }
    .birthday-footer {
        padding: 16px 24px;
        background: white;
        border-top: 1px solid #dbeafe;
        display: flex;
        justify-content: center;
    }
    .birthday-dismiss-btn {
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%) !important;
        border: none !important;
        padding: 12px 28px;
        font-weight: 600;
        font-size: 14px;
        border-radius: 8px;
        color: #ffffff !important;
    }
    .birthday-dismiss-btn:hover {
        opacity: 0.9;
    }

    /* Confetti Animation */
    .confetti-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 10001;
        overflow: hidden;
    }
    .confetti {
        position: absolute;
        opacity: 0;
        will-change: transform, opacity;
    }
    </style>

    <script>
    (function() {
        // Check if we already showed the birthday alert today
        const storageKey = 'birthday_alert_shown_' + new Date().toISOString().slice(0, 10);

        async function checkBirthdays() {
            // Skip if already shown today
            if (sessionStorage.getItem(storageKey)) {
                return;
            }

            try {
                const response = await fetch('<?= APP_URL ?>?api=utenti&action=check-birthdays');
                const data = await response.json();

                if (data.success && data.data && data.data.count > 0) {
                    showBirthdayModal(data.data.birthdays);
                }
            } catch (error) {
                console.error('Errore controllo compleanni:', error);
            }
        }

        function showBirthdayModal(birthdays) {
            const body = document.getElementById('birthdayModalBody');
            const title = document.getElementById('birthdayModalTitle');

            // Update title based on count
            title.textContent = birthdays.length === 1
                ? 'Compleanno Oggi!'
                : `Compleanni Oggi! (${birthdays.length})`;

            let html = '';

            birthdays.forEach(person => {
                const initials = (person.nome?.charAt(0) || '') + (person.cognome?.charAt(0) || '');
                const fullName = `${person.nome} ${person.cognome}`;
                const ageText = person.eta ? `Compie ${person.eta} anni!` : '';

                html += `
                    <div class="birthday-person">
                        <div class="birthday-avatar">${initials.toUpperCase()}</div>
                        <div class="birthday-name">${fullName}</div>
                        <div class="birthday-age">${ageText}</div>
                    </div>
                `;
            });

            html += `
                <div class="birthday-message">
                    Ricordati di fare gli auguri!
                </div>
            `;

            body.innerHTML = html;

            // Show modal
            document.getElementById('modalBirthdayAlert').classList.add('active');
            document.body.style.overflow = 'hidden';

            // Launch confetti!
            launchConfetti();
        }

        function launchConfetti() {
            // Create confetti container
            let container = document.querySelector('.confetti-container');
            if (!container) {
                container = document.createElement('div');
                container.className = 'confetti-container';
                document.body.appendChild(container);
            }
            container.innerHTML = '';

            const colors = ['#4a6cf7', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
            const shapes = ['square', 'circle'];
            const confettiCount = 100;

            for (let i = 0; i < confettiCount; i++) {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';

                // Random properties
                const color = colors[Math.floor(Math.random() * colors.length)];
                const shape = shapes[Math.floor(Math.random() * shapes.length)];
                const size = Math.random() * 10 + 6;
                const startX = Math.random() * 100;
                const startY = Math.random() * 30 + 20; // Start from middle-upper area
                const delay = Math.random() * 0.5;
                const duration = Math.random() * 2 + 2;
                const rotateEnd = Math.random() * 1440 - 720;
                const spreadX = (Math.random() - 0.5) * 200;

                confetti.style.cssText = `
                    left: ${startX}%;
                    top: ${startY}%;
                    width: ${size}px;
                    height: ${size}px;
                    background: ${color};
                    border-radius: ${shape === 'circle' ? '50%' : '2px'};
                    animation: confettiExplode ${duration}s ease-out ${delay}s forwards;
                    --spread-x: ${spreadX}px;
                `;

                // Custom animation with spread
                confetti.style.animation = 'none';
                confetti.offsetHeight; // Trigger reflow
                confetti.style.animation = null;

                container.appendChild(confetti);

                // Animate with JS for better control
                setTimeout(() => {
                    confetti.style.transition = `all ${duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
                    confetti.style.opacity = '1';
                    confetti.style.transform = `translateX(${spreadX}px) translateY(${window.innerHeight}px) rotate(${rotateEnd}deg)`;

                    setTimeout(() => {
                        confetti.style.opacity = '0';
                    }, duration * 800);
                }, delay * 1000);
            }

            // Clean up after animation
            setTimeout(() => {
                if (container) container.innerHTML = '';
            }, 4000);
        }

        window.closeBirthdayModal = function() {
            document.getElementById('modalBirthdayAlert').classList.remove('active');
            document.body.style.overflow = '';
        };

        window.dismissBirthdayAlert = function() {
            // Mark as shown for today
            sessionStorage.setItem(storageKey, 'true');
            closeBirthdayModal();
        };

        // Start check after page loads (with slight delay after sopralluogo notifications)
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => setTimeout(checkBirthdays, 2000));
        } else {
            setTimeout(checkBirthdays, 2000);
        }
    })();
    </script>
    <?php endif; ?>
    <?php endif; ?>

    <!-- Tab Loading -->
    <style>
    .tab-loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255,255,255,0.7);
        z-index: 9999;
        display: none;
        align-items: center;
        justify-content: center;
    }
    .tab-loading-overlay.active {
        display: flex;
    }
    .tab-loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid #e5e7eb;
        border-top-color: var(--primary, #4a6cf7);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    </style>
    <div class="tab-loading-overlay" id="tabLoadingOverlay">
        <div class="tab-loading-spinner"></div>
    </div>
</body>
</html>
