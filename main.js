let resultsDiv;
let resultTemplate;

let spigotPlugins = [];
let curseforgePlugins = [];

let mergedPlugins = [];

function onSearchLoad() {

    let ms = Date.now();

    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has('query') || urlParams.get('query') == '') {
        window.location.href = '/'
        return;
    }

    const query = urlParams.get('query');

    resultsDiv = document.getElementById('results');
    resultTemplate = document.getElementsByTagName('template')[0]
    messageResults("")

    document.getElementById('searchinput').value = urlParams.get('query');

    let promises = []
    messageResults("Searching... This might take a few seconds...")
    promises.push(getSpigetPlugins(query))
    promises.push(getCurseforgePlugins(query))
    

    Promise.all(promises).then(() => {
        
        mergeResults()
        messageResults("")
        mergedPlugins.forEach(result => {
            createSearchEntry(result)
        })

        let nowMs = Date.now()-ms;
        console.log('Done in '+nowMs+'ms')
    });
}

function messageResults(text) {
    if (resultsDiv === undefined) {
        return;
    }
    resultsDiv.innerHTML = text;
}

async function getSpigetPlugins(searchQuery) {
    const response = await fetch("https://api.spiget.org/v2/search/resources/"+ searchQuery +"?size=50&sort=-downloads&fields=id%2Cname%2Ctag%2Cdownloads%2CsourceCodeLink");
    let json = await response.json();
    json.forEach(element => {
        let entry = [];
        entry['name'] = element['name'];
        entry['desc'] = element['tag'];
        entry['spigot_id'] = element['id'];
        entry['curseforge_id'] = undefined;
        entry['downloads'] = element['downloads'];
        entry['source'] = element['sourceCodeLink']
        if (entry['source'] !== undefined && entry['source'].endsWith('/')) {
            entry['source'] = entry['source'].substring(0, entry['source'].length-1)
        }
        spigotPlugins.push(entry);
    });
}

async function getCurseforgePlugins(searchQuery) {
    const response = await fetch("https://api.curseforge.com/servermods/projects?search=" + searchQuery);
    let json = await response.json();
    let promises = [];
    json.forEach(element => {
        var p = getCurseforgePluginInfo(element['id'])
        promises.push(p);
    });
    return Promise.all(promises);
}

async function getCurseforgePluginInfo(id) {
    let ms = Date.now();
    console.log('Fetching for id '+id)
    const response = await fetch("https://addons-ecs.forgesvc.net/api/v2/addon/" + id);
    await response.json().then(data => {
        let pluginData = [];
        pluginData['name'] = data['name'];
        pluginData['desc'] = data['summary'];
        pluginData['spigot_id'] = undefined;
        pluginData['curseforge_slug'] = data['slug'];
        pluginData['downloads'] = data['downloadCount'];
        pluginData['source'] = data['sourceUrl']
        if (pluginData['source'] !== undefined && pluginData['source'].endsWith('/')) {
            pluginData['source'] = pluginData['source'].substring(0, pluginData['source'].length-1)
        }
        let nowMs = Date.now()-ms;
        console.log('Got data for id '+id+' in '+nowMs+'ms')
        curseforgePlugins.push(pluginData);
    });
}

function mergeResults() {
    mergedPlugins = [];
    spigotPlugins.forEach((spPlugin) => {
        mergedPlugins.push(spPlugin);
    });
    curseforgePlugins.forEach((cfPlugin) => {
        var merged = false;
        mergedPlugins.forEach(plugin => {
            if (plugin['source'] !== undefined && plugin['source'] === cfPlugin['source']) {
                plugin['curseforge_slug'] = cfPlugin['curseforge_slug']
                plugin['downloads'] += cfPlugin['downloads']
                merged = true;
                return;
            }
        })
        if (!merged) {
            mergedPlugins.push(cfPlugin)
        }
        
    });
    mergedPlugins.sort((a,b) => {
        return b['downloads'] - a['downloads'];
    });
}


function createSearchEntry(plugin) {
    var clone = resultTemplate.content.cloneNode(true);
    clone.querySelectorAll('h2')[0].innerHTML = plugin['name']
    clone.querySelectorAll('p')[0].innerHTML = plugin['desc']

    downloads = ''

    if (plugin['spigot_id'] !== undefined) {
        downloads += '<a href="https://www.spigotmc.org/resources/'+plugin['spigot_id']+'">SpigotMC</a>';
    }
    if (plugin['curseforge_slug'] !== undefined) {
        downloads += '<a href="https://www.curseforge.com/minecraft/bukkit-plugins/'+plugin['curseforge_slug']+'">CurseForge</a>';
    }

    clone.querySelectorAll('p')[1].innerHTML = downloads

    resultsDiv.appendChild(clone)
}