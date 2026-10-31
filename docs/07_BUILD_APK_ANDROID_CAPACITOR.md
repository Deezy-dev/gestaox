# CAPÍTULO 7 · GUIA DE BUILD DOS APKS ANDROID (CAPACITOR CLI)

Este guia prático ensina a compilar, assinar e distribuir os APKs do **Cliente** e do **Staff Piquete** inteiramente via linha de comando (CLI), sem complicação.

---

## 1. Visão Geral: Cliente vs. Staff

| Funcionalidade | APK Cliente (`ao.osdel.cliente`) | APK Staff Piquete (`ao.osdel.staff`) |
| :--- | :--- | :--- |
| **Público** | Clientes finais da OSDEL | Técnicos de campo, piquetes e operadores |
| **Acessos** | Facturas, comprovativos, canais TV | Ordens de Serviço, vistorias, cortes/religações |
| **Hardware** | Visualização e downloads de PDF | GPS, Câmera para fotos de PDO, leitura de QR |
| **Instalação** | Download direto via WhatsApp/Portal | Instalação obrigatória nos telemóveis da equipa |

---

## 2. Pré-Requisitos no Computador de Build

1. **Java Development Kit (JDK 17 ou 21)**:
   ```bash
   java -version
   ```
2. **Android SDK & Command-Line Tools**:
   Configure as variáveis de ambiente no seu sistema:
   ```bash
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools
   ```
3. **Node.js 18+** e **npm**.

---

## 3. Fluxo de Instalação e Inicialização do Capacitor

Se estiver configurando um novo projeto Android do zero:
```bash
# 1. Instalar pacotes Capacitor
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android

# 2. Inicializar o projeto Capacitor
npx cap init "OSDEL Cliente" "ao.osdel.cliente" --web-dir "dist"

# 3. Adicionar a plataforma Android nativa
npx cap add android

# 4. Sincronizar os ficheiros do frontend com o Android
npm run build
npx cap sync
```

---

## 4. Diferença entre APK Debug e APK Release

- **APK Debug (`app-debug.apk`)**:
  - Compilado com a chave de depuração padrão do Android.
  - Não requer assinatura manual.
  - Perfeito para testes imediatos e envio direto aos técnicos via WhatsApp/Telegram para uso no dia-a-dia nos primeiros tempos.
- **APK Release (`app-release.apk`)**:
  - Compilado com otimizações de código (R8/Proguard, minificação de bytecode).
  - Requer assinatura digital com uma Keystore privada.
  - Obrigatório caso deseje publicar na Google Play Store futuramente.

---

## 5. Como Gerar a Keystore (Assinatura Digital)

Execute o comando `keytool` para gerar uma chave RSA criptográfica de 2048 bits com validade de 25 anos (10.000 dias):

```bash
keytool -genkeypair -v \
  -keystore osdel-release-key.keystore \
  -alias osdel_prod \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -dname "CN=OSDEL Tecnologia, OU=Engenharia, O=OSDEL, L=Luanda, ST=Luanda, C=AO" \
  -storepass "osdel@suporte#2026" \
  -keypass "osdel@suporte#2026"
```
> **Atenção**: Guarde o arquivo `osdel-release-key.keystore` e a senha em local seguro! Se perder esta chave, não será possível atualizar o app já instalado nos aparelhos sem desinstalar primeiro.

---

## 6. Compilação dos APKs na Linha de Comando (Passo a Passo)

### Compilar APK Debug (Pronto para Usar Imediatamente):
```bash
cd gestaox/mobile/cliente/android
# No Linux / macOS:
./gradlew assembleDebug

# No Windows:
gradlew.bat assembleDebug
```
O APK final estará localizado em:
`android/app/build/outputs/apk/debug/app-debug.apk`

Renomeie para facilitar o envio:
```bash
cp android/app/build/outputs/apk/debug/app-debug.apk ./OSDEL_Cliente.apk
```

---

### Compilar e Assinar APK Release:
```bash
# 1. Gerar o APK não assinado
./gradlew assembleRelease

# 2. Alinhar o pacote (zipalign)
zipalign -v -p 4 \
  android/app/build/outputs/apk/release/app-release-unsigned.apk \
  android/app/build/outputs/apk/release/app-release-aligned.apk

# 3. Assinar com a Keystore gerada (apksigner)
apksigner sign \
  --ks osdel-release-key.keystore \
  --ks-key-alias osdel_prod \
  --ks-pass pass:osdel@suporte#2026 \
  --out ./OSDEL_Cliente_Release_Assinado.apk \
  android/app/build/outputs/apk/release/app-release-aligned.apk
```

---

## 7. Como Resolver os Erros Mais Comuns na Linha de Comando

1. **`SDK location not found`**:
   - Crie o arquivo `android/local.properties` com o conteúdo:
     ```properties
     sdk.dir=/home/<usuario>/Android/Sdk
     ```
2. **`JAVA_HOME is not set`**:
   - Defina o caminho do Java:
     ```bash
     export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
     ```
3. **`Cleartext HTTP traffic not permitted`**:
   - O `AndroidManifest.xml` já foi configurado com `android:usesCleartextTraffic="true"` permitindo chamadas tanto HTTP quanto HTTPS locais e externas sem bloqueio de segurança do Android.

---

## 8. Roteiro para Publicação Futura na Google Play Store
Quando a empresa optar por publicar na Play Store:
1. Em vez de `assembleRelease`, gere o formato Android App Bundle (`.aab`):
   ```bash
   ./gradlew bundleRelease
   ```
2. O arquivo será gerado em: `android/app/build/outputs/bundle/release/app-release.aab`.
3. Assine o `.aab` com o `jarsigner`.
4. Acesse o **Google Play Console**, crie a ficha do app e faça upload do `.aab`.
