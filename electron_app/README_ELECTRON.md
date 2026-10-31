# OSDEL TECNOLOGIA · CLIENTES DESKTOP ELECTRON (FIBRA & TV CABO)
======================================================================

Dois aplicativos Desktop nativos e profissionais para Windows (.exe), construídos em **Electron** e empacotando **100% das funcionalidades, design, tabelas, modais e bases de dados do sistema oficial**:

1. **OSDEL Fibra Óptica Desktop** (`OSDEL_Fibra_Desktop_Setup_1.0.0.exe`): Focado em Internet Fibra FTTH, banda larga (10 a 100 Mbps), gestão de caixas PDO, modems ONU e conexões ópticas.
2. **OSDEL TV por Cabo Desktop** (`OSDEL_TV_Cabo_Desktop_Setup_1.0.0.exe`): Focado em TV a Cabo Comunitária, sinal RF, grelha de canais HD, mensalidades e piquetes de TV.

Ambos os aplicativos contam com:
- **Design 100% Idêntico ao Sistema Web**: Todas as páginas, tabelas, modais, gráficos e métricas em Kwanzas (`Kz`).
- **Bloqueio de Janela Única**: Quando uma janela já está aberta, outra não pode ser aberta; a janela ativa é automaticamente trazida para primeiro plano.
- **Segurança de Login por Sessão**: Sempre que uma janela é aberta ou iniciada, é exigido login com credenciais oficiais.
- **Suporte Nativo a Impressoras Térmicas POS**: Impressão direta de talões térmicos (80mm e 58mm).
- **Facturação A4 Oficial**: Emissão e exportação em formato fiscal padrão.
- **Execução Offline / Local**: Funciona mesmo sem conexão à internet através do bundle pré-compilado em `dist/`.

---

## 1. O que foi Corrigido no Build do Electron

Se você fez o build anteriormente e o app não abriu ou fechava imediatamente:
1. **Sincronização Automática (`sync_dist.js`)**: O compilador do Electron precisava que o bundle React/Vite estivesse copiado para dentro de `electron_app/dist`. Agora existe o script `node sync_dist.js` que roda automaticamente antes de qualquer build.
2. **Ícones Nativos (`assets/icon.ico`)**: O `electron-builder` requer um ficheiro `.ico` no Windows. O ícone oficial de alta definição já foi gerado e incluído.
3. **Protocolo `file://` & Service Worker**: O Service Worker (PWA) tentava registar-se em protocolo local `file://`, gerando erro interno no Chromium. O script de sincronização adapta automaticamente o código para não gerar exceções.
4. **Tratamento de Janela Oculta**: Adicionado timeout de emergência de 1.5s para exibir a janela imediatamente mesmo se o evento `ready-to-show` demorar.

---

## 2. Como Gerar os Executáveis (.exe) para Windows

### Opção A: Clicar nos ficheiros `.bat` (Recomendado no Windows)
Na pasta `electron_app`:
- Clicar duas vezes em **`build_fibra_exe.bat`** ➔ Compila o executável da Fibra Óptica.
- Clicar duas vezes em **`build_tv_exe.bat`** ➔ Compila o executável da TV por Cabo.
- Clicar duas vezes em **`build_both_exe.bat`** ➔ Compila ambos os `.exe` de uma só vez!

### Opção B: Pelo Terminal / Linha de Comandos
Na pasta raiz do projeto:
```bash
# Compilar o executável de Fibra Óptica:
npm run electron:build:fibra

# Compilar o executável de TV por Cabo:
npm run electron:build:tv

# Compilar ambos os executáveis:
npm run electron:build:both
```

Ou dentro da pasta `electron_app`:
```bash
# 1. Sincronizar o bundle (já roda automaticamente no prebuild):
node sync_dist.js

# 2. Compilar Fibra:
npm run build:fibra

# 3. Compilar TV:
npm run build:tv
```

---

## 3. Onde Ficam os Ficheiros `.exe` Prontos

Após o build, os ficheiros executáveis estarão localizados em:
- **Fibra Óptica**:
  - Instalador: `electron_app/dist_fibra_exe/OSDEL_Fibra_Desktop_Setup_1.0.0.exe`
  - Portátil: `electron_app/dist_fibra_exe/OSDEL_Fibra_Desktop_1.0.0.exe`

- **TV por Cabo**:
  - Instalador: `electron_app/dist_tv_exe/OSDEL_TV_Cabo_Desktop_Setup_1.0.0.exe`
  - Portátil: `electron_app/dist_tv_exe/OSDEL_TV_Cabo_Desktop_1.0.0.exe`

---

## 4. Como Testar Imediatamente sem Gerar o `.exe`
Se quiser testar a janela Electron diretamente na sua máquina:
- Executar `iniciar_fibra.bat` (ou `npm run electron:fibra`)
- Executar `iniciar_tv_cabo.bat` (ou `npm run electron:tv`)
