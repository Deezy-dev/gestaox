# CAPÍTULO 8 · GUIA DE BUILD DO APLICATIVO DESKTOP WINDOWS (ELECTRON)

Este capítulo fornece o manual completo para empacotamento do **Gestão X** em instaladores e executáveis nativos para o sistema operacional Microsoft Windows.

---

## 1. Estrutura Arquitetural do Electron
A pasta `gestaox/desktop/electron/` foi projetada para total isolamento entre o processo principal do sistema operacional e o motor de renderização:

- **`main.js`**: Gerencia o ciclo de vida do executável, redimensionamento de janelas, aceleração de hardware, atalhos de teclado e passagem de argumentos de linha de comando (`--mode=fibra`, `--mode=tv`, `--mode=combo`).
- **`preload.js`**: Cria um canal IPC seguro (`contextBridge`) que disponibiliza a API nativa `window.electronAPI` para o frontend, bloqueando acessos indevidos ao Node.js direto na página web.
- **`electron-builder.yml`**: Configuração declarativa dos alvos de compilação: **NSIS (Instalador Setup com assistente)** e **Portable (Executável direto)**.

---

## 2. Configuração do `package.json`
As dependências foram configuradas estritamente:
```json
{
  "name": "gestaox-desktop",
  "productName": "Gestão X",
  "version": "2.0.0",
  "main": "main.js",
  "scripts": {
    "electron": "electron . --dev",
    "electron:fibra": "electron . --mode=fibra",
    "electron:tv": "electron . --mode=tv",
    "electron:combo": "electron . --mode=combo",
    "build-electron": "electron-builder --win",
    "build:setup": "electron-builder --win nsis",
    "build:portable": "electron-builder --win portable",
    "build:all": "electron-builder --win nsis portable"
  },
  "devDependencies": {
    "electron": "^33.2.0",
    "electron-builder": "^25.1.8"
  }
}
```

---

## 3. Procedimento de Build para Produção

### Passo 1: Gerar a build do Frontend
Na pasta do frontend (`gestaox/frontend` ou na raiz):
```bash
npm run build
```

### Passo 2: Copiar os ficheiros estáticos para a pasta do Electron
```bash
cp -r gestaox/frontend/dist gestaox/desktop/electron/dist
```

### Passo 3: Instalar as dependências do empacotador
```bash
cd gestaox/desktop/electron
npm install
```

---

## 4. Geração dos Executáveis (`setup.exe` e `portable.exe`)

Execute o comando unificado de compilação:
```bash
npm run build:all
```

Ao término, os binários estarão na pasta `dist-electron/`:

1. **`GestaoX-Setup-2.0.0.exe`**:
   - Instalador completo assistido NSIS.
   - Pergunta o diretório de instalação (ex: `C:\Program Files\Gestão X`).
   - Cria atalhos no Ambiente de Trabalho e Menu Iniciar.
   - Adiciona entrada limpa de desinstalação no "Adicionar ou Remover Programas" do Windows.
2. **`GestaoX-Portable-2.0.0.exe`**:
   - Executável 100% autônomo.
   - Não requer privilégios de Administrador.
   - Pode ser executado diretamente de uma Pen-drive nos balcões de atendimento da OSDEL.

---

## 5. Modalidades Específicas: Fibra, TV e Combo

O executável suporta inicialização direcionada através de argumentos de linha de comando. É possível criar atalhos dedicados no Windows para cada setor:

- **Atalho para Balcão de Fibra**:
  `"C:\Program Files\Gestão X\Gestão X.exe" --mode=fibra`
- **Atalho para Balcão de TV por Cabo**:
  `"C:\Program Files\Gestão X\Gestão X.exe" --mode=tv`
- **Atalho Geral / Combo**:
  `"C:\Program Files\Gestão X\Gestão X.exe" --mode=combo`

---

## 6. Ícones Personalizados
Para alterar o ícone oficial do executável Windows:
1. Prepare a imagem oficial da OSDEL em formato quadrado (`512x512` pixels).
2. Converta para `.ico` contendo as camadas de resolução padrão do Windows: `16x16`, `24x24`, `32x32`, `48x48`, `64x64`, `128x128`, `256x256`.
3. Salve o arquivo em: `gestaox/desktop/electron/build-assets/icon.ico`.
4. Ao rodar `npm run build:all`, o `electron-builder` embutirá o novo ícone em todas as resoluções.

---

## 7. Atualização Futura do Sistema Desktop
1. No arquivo `gestaox/desktop/electron/package.json`, altere o campo `"version"` (ex: de `"2.0.0"` para `"2.1.0"`).
2. Substitua a pasta `dist` pelos novos assets compilados.
3. Execute `npm run build:all`.
4. O novo instalador atualizará os arquivos preservando automaticamente os dados de sessão e caches locais dos utilizadores.
