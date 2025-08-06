const beautify      = require('js-beautify').html;  // для красивого форматирования html
const fs            = require('fs-extra');
const path          = require('path');
const pug           = require('pug');               // для парсинга PUG
const showdown      = require('showdown');          // для парсинга MARKDOWN
const toml          = require('toml');              // для парсинга TOML

//-------------------------------------------------------------------
// функции получения содержимого папок (без рекурсии)
const getListDirs  = (inp_path) => fs.readdirSync(inp_path, {withFileTypes:true}).filter(i => i.isDirectory()).map(i => i.name);
const getListFiles = (inp_path) => fs.readdirSync(inp_path, {withFileTypes:true}).filter(i => i.isFile()     ).map(i => i.name);
const getListAll   = (inp_path) => { // с рекурсией (только файлы)
    let ret = getListFiles(inp_path).map(item => `${inp_path}/${item}`);        // сначала собираем все файлы
    for (let item of getListDirs(inp_path)) {                                   // потом идем по вложенным папкам
        ret = ret.concat(getListAll(`${inp_path}/${item}`));                    // и рекурсивно читаем все файлы от туда
    }
    return ret;
}
//-------------------------------------------------------------------
const transformPath = (inp_str, inp_old, inp_new) => inp_new + inp_str.slice(inp_old.length);  // путь к файлу трансформируем из старой папки в новую
const converter = new showdown.Converter();                                                    // вспомогательная функция для парсинга MARKDOWN
//-------------------------------------------------------------------
// из файла TOML+MARKDOWN получаем спаршеный объект
function getContentFromFile(inp_path, inp_url) {
    const linesFile = fs.readFileSync(inp_path).toString().split('\n');         // читаем указанный файл по строкам
    let content_toml = '';
    let content_md = '';
    if ((linesFile.length > 0) && (linesFile[0] === '+++')) {                   // если есть блок с TOML разметкой
        let isToml = true;                                                      // сейчас идем по TOML участку
        for (let i = 1; i < linesFile.length; i++) {                            // цикл по строкам файла (кроме первой)
            if (linesFile[i] === '+++') { isToml = false; continue; }           // если TOML участок закончился, переключаемся
            if (isToml) { content_toml += linesFile[i] + '\n'; }                // в зависимости от режима кладем в разные строки
            else        { content_md   += linesFile[i] + '\n'; }                // и тут тоже самое
        }
    } else {                                                                    // если в этом файле нет TOML участка
        for (let item of linesFile) { content_md += item + '\n'; }              // сразу кладем в MARKDOWN строку
    }
    content_toml = JSON.parse(JSON.stringify( toml.parse(content_toml) ));      // парсим TOML
    content_md = converter.makeHtml(content_md);                                // парсим MARKDOWN
    let canonical = inp_url;
    if (canonical.endsWith('/index.html')) { canonical = canonical.slice(0, -10); }
    if (canonical.endsWith('.html')) { canonical = canonical.slice(0, -5); }
    return {...content_toml, 'content': content_md, 'url': inp_url, 'canonical': canonical};  // возвращаем результат парсинга
}
//-------------------------------------------------------------------
// непосредственно сборка сайта
function _build(inp_domain, inp_path_pug, inp_path_content, inp_path_out) {
    let sitemap = [];
    fs.removeSync(inp_path_out);                                                // удаляем результирующую папку (чистка от старого)
    let markdownAll = [];
    let otherAll = [];
    for (const itemFile of getListAll(inp_path_content)) {                      // сначала обходим обзорно + делаем то, что можно
        const typeFile = itemFile.split('.').pop();                             // получаем тип файла из папки контента
        if (typeFile === 'md') {                                                // если MARKDOWN, то надо парсить и собирать шаблонизатором
            const outNameFile = transformPath(itemFile, inp_path_content, inp_path_out).replace('.md', '.html'); // трансформируем путь
            markdownAll.push({
                'outFile':          outNameFile,
                'contentFromFile':  getContentFromFile(itemFile, transformPath(outNameFile, inp_path_out, '')),
            });
        } else {                                                                // все остальные файлы просто копируем как статические
            const outNameFile = transformPath(itemFile, inp_path_content, inp_path_out); // трансформируем путь (сюда будем писать)
            const urlNameFile = transformPath(itemFile, inp_path_content, '');  // трансформируем путь (формат ссылки)
            fs.ensureDirSync(path.dirname(outNameFile));                        // создаем необходимые папки для этого файла
            fs.copySync(itemFile, outNameFile);                                 // копируем
            console.log(['STATIC', urlNameFile]);
            let contentFromFile = '';
            if (typeFile === 'json') { contentFromFile = JSON.parse( fs.readFileSync(itemFile).toString() ); }
            otherAll.push({
                'url': urlNameFile,
                'content': contentFromFile,
            });
        }
    }
    for (const markdownItem of markdownAll) {                                    // потом обходим уже для генерации html
        const templatePug = markdownItem['contentFromFile']['template'];         // смотрим, какой будет использоваться шаблон
        const datePug     = markdownItem['contentFromFile']['publication_date']; // берем дату публикации (может быть undefined)
        fs.ensureDirSync(path.dirname(markdownItem['outFile']));                 // создаем необходимые папки для этого файла
        fs.writeFileSync(markdownItem['outFile'],                                // рендерим страницу
            beautify(pug.renderFile(`${inp_path_pug}/${templatePug}.pug`, {
                'current': markdownItem['contentFromFile'],
                'all': markdownAll.map(item => item['contentFromFile']),
                'other': otherAll,
            })));
        sitemap.push({
            'url': markdownItem['contentFromFile']['canonical'], // сохраняем все url, которые создаем
            'date': datePug,
        });
        console.log(['MARKDOWN',
            markdownItem['contentFromFile']['url'],
            markdownItem['contentFromFile']['canonical'],
        ]);
    }
    // sitemap.xml
    fs.writeFileSync(`${inp_path_out}/sitemap.xml`, [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        sitemap.map(({url, date}) => [
        '   <url>',
                '<loc>https://' + inp_domain + url + '</loc>',
        date ?  '<lastmod>' + date + '</lastmod>' : '',
        '   </url>',
        ].join('\n')).join('\n'),
        '</urlset>',
    ].join('\n'));
    // robots.txt
    fs.writeFileSync(`${inp_path_out}/robots.txt`, [
        'User-agent: *',
        'Allow: /',
        `Sitemap: https://${inp_domain}/sitemap.xml`,
    ].join('\n'));
}
//-------------------------------------------------------------------
function _redirect(from, to, out) {
    fs.removeSync(out);
    fs.ensureDirSync(out);
    fs.writeFileSync(out + '/.htaccess', [
        `RewriteEngine On`,
        `RewriteCond %{HTTP_HOST} ${from}`,
        `RewriteRule (.*) https://${to}/$1 [R=301,L]`,
    ].join('\n'));
}
//-------------------------------------------------------------------
(() => {
    const PATH = process.cwd() + '/www';
    console.log(['PATH', PATH]);
    _build(
        process.env.DOMAIN,
        PATH + '/template',
        PATH + '/content',
        PATH + '/public',
    );
})();
//-------------------------------------------------------------------
