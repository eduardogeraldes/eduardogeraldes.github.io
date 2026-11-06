# Portefólio de Eduardo Geraldes

Site estático (HTML, CSS e JavaScript), sem instalação e sem bibliotecas. Funciona no GitHub Pages.

## Ver no computador

Abre `index.html` no browser. Para testar como num servidor, na pasta do site:

```
python3 -m http.server 8000
```

e abre http://localhost:8000.

## Publicar no GitHub Pages (gratuito)

1. Cria uma conta em github.com (se ainda não tens).
2. Cria um repositório **público** com o nome `<o-teu-utilizador>.github.io`.
3. Carrega para lá o conteúdo desta pasta (Add file > Upload files, e arrasta tudo, incluindo as pastas `assets` e `dados` e o ficheiro `.nojekyll`).
4. Em Settings > Pages, confirma *Deploy from a branch*, ramo `main` e pasta `/ (root)`.
5. Passados 1 a 2 minutos, o site fica em `https://<o-teu-utilizador>.github.io`.

A página 404 usa caminhos absolutos, por isso o repositório deve chamar-se `<utilizador>.github.io`. Se usares outro nome, troca `/assets/` e `/` por caminhos relativos em `404.html`.

## Estrutura

```
index.html                 início: gráfico, projetos, sobre e competências
projeto-expedicao.html     página do projeto da operação de expedição
painel-expedicao.html      painel interativo (incorporado na página do projeto)
contactos.html             formulário e LinkedIn (o e-mail não aparece escrito na página)
404.html                   página de erro
assets/                    estilos, scripts (main.js, chart.js, fx.js), fontes (Barlow, licença OFL), foto e ícone
dados/                     dados simulados e o modelo que os gera
```

## Como editar

- **Textos:** estão nos ficheiros `.html`. Abre-os com um editor de texto e muda o que precisares.
- **Adicionar um projeto:** em `index.html`, copia um bloco `<article class="row">` da secção Projetos e ajusta o título, as ferramentas, o texto e o estado. Para um projeto em curso usa `row row--wip` no artigo e `chip chip--wip` na etiqueta do estado.
- **Passadeira de competências:** são os blocos `<li class="box">` no início da página. Há duas listas iguais (a segunda é só para a animação ser contínua): se mudares uma, muda a outra.
- **Números da operação:** a faixa colorida dos números usa `data-to="..."` para o valor final de cada número.
- **Foto:** é `assets/img/eduardo.jpg` (640 x 640 píxeis). Para trocar, substitui o ficheiro mantendo o nome.
- **Cores e modos:** estão no início de `assets/css/style.css`: o bloco `:root` é o modo escuro e `html[data-theme="light"]` é o modo claro. O botão no cabeçalho alterna entre os dois e o browser lembra a escolha; sem escolha, abre em escuro.
- **Animações:** as de entrada e de scroll estão em `style.css`; os efeitos que seguem o rato (rede de pontos, cursor, brilho e inclinação dos cartões, botões magnéticos, parallax) estão em `assets/js/fx.js`. Para os desligar, tira a linha `fx.js` no fim de cada página. Tudo respeita a preferência "reduzir movimento" do sistema, o cursor e a inclinação só aparecem com rato, e sem JavaScript o conteúdo aparece todo.
- **Gráfico do início:** os dados estão em `assets/js/data.js`.
- **E-mail do formulário:** está só em `assets/js/main.js` (`EMAIL`).

## Notas

- Os dados dos projetos são simulados e isso está indicado nas páginas. Mantém essa indicação.
- Quando acabares um projeto, atualiza o estado e as ferramentas (por exemplo, quando a versão em Power BI estiver feita).
