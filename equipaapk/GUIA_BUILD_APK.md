# GUIA DE COMPILAÇÃO DO APK: OSDEL CLIENTE
> **Aplicativo Android Oficial para Clientes OSDEL TECNOLOGIA (TV & Internet Fibra)**

Este diretório (`/clienteapk`) contém todo o código-fonte independente e autónomo do aplicativo móvel para o cliente final.

---

## 1. O que este aplicativo faz
- **Consulta de Contrato**: Visualização dos pacotes activos de TV Comunitária e Fibra, velocidade contratada, canais e morada.
- **Histórico & Facturas**: Acesso aos pagamentos anteriores e referências de liquidação.
- **Avisos & Pagamento Multicaixa Express**: Códigos de Entidade e Referência oficiais da OSDEL para pagamento no telemóvel ou ATM.
- **Fazer Acordo de Pagamento (Evitar Corte de Sinal)**:
  - O cliente escolhe a data em que pode pagar e envia a justificativa.
  - Assim que o operador da OSDEL confirma no sistema, o cliente recebe a confirmação e fica protegido contra cortes.
- **Abertura de Chamado Técnico / Relatar Avaria**:
  - Relato de cabos rompidos, chuvisco na TV, problemas de sinal ou quebra de fibra com fotos e acompanhamento do estado.
- **Mural de Notícias & Manutenções da Fibra**: Avisos em tempo real da OSDEL.

---

## 2. Configurar a URL do Servidor (API)
Abra o ficheiro:
```
clienteapk/src/config/api.ts
```
E altere a variável `API_BASE_URL` para o endereço da sua empresa:
```typescript
export const API_BASE_URL: string = 'https://api.osdeltecnologia.ao';
```
*(Se estiver a testar em rede local Wi-Fi, pode usar `http://192.168.1.100:3000`)*.

---

## 3. Como Gerar o Arquivo APK para Instalar no Celular

### MÉTODO 1: Com Capacitor e Android Studio (Recomendado)

#### Passo 1: Entrar na pasta e instalar dependências
No terminal do seu computador (PowerShell, CMD ou Bash):
```bash
cd clienteapk
npm install
```

#### Passo 2: Instalar as ferramentas do Capacitor Android
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
```

#### Passo 3: Compilar o código Web para a pasta `dist`
```bash
npm run build
```

#### Passo 4: Adicionar a plataforma Android nativa
```bash
npx cap add android
```
*(Este comando cria a pasta nativa `android/` com o projeto Gradle pronto)*.

#### Passo 5: Sincronizar o projeto
```bash
npx cap sync
```

#### Passo 6: Abrir no Android Studio para gerar o APK
```bash
npx cap open android
```
No Android Studio que se abre automaticamente:
1. Aguarde o Gradle finalizar a sincronização (Sync).
2. No menu superior, clique em **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
3. Quando concluir, o Android Studio exibe uma notificação com o botão **locate**.
4. O seu ficheiro APK estará pronto na pasta:
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```
5. Basta enviar este ficheiro `.apk` para o telemóvel dos clientes via WhatsApp, Telegram, Pendrive ou hospedar no site da OSDEL para download!

---

### MÉTODO 2: Gerar APK em 2 Minutos sem Android Studio (PWABuilder)
Se não tiver o Android Studio instalado no computador:

1. Suba esta pasta ou publique a versão web num servidor (ou use a URL partilhada do AI Studio).
2. Aceda ao site oficial da Microsoft: **[https://www.pwabuilder.com](https://www.pwabuilder.com)**.
3. Cole o link da sua aplicação cliente.
4. Clique em **Package for Android**.
5. Clique em **Generate APK**.
6. O PWABuilder compila nos servidores deles e entrega-lhe o ficheiro `.apk` pronto para instalar directamente no telemóvel Android!

---

## 4. Testar no Telemóvel
Para instalar no telefone Android:
1. Abra o arquivo `.apk` no telemóvel.
2. Se o Android perguntar, autorize a instalação de **"Fontes Desconhecidas"** para este aplicativo da OSDEL.
3. O ícone da **OSDEL Cliente** aparecerá no ecrã inicial do telefone com funcionamento completo!
