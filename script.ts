class Server {
    name: string
    services: Array<Service> = []

    constructor(name: string) {
        this.name = name
    }

    public addService(service: Service) {
        this.services.push(service)
    }
}

class Service {
    name: string
    healthURL?: string

    constructor(name: string, healthURL?: string) {
        this.name = name
        this.healthURL = healthURL
    }

    public async healthCheck() : Promise<Status | null> {
        if (this.healthURL === undefined) {
            return null
        }

        try {
            const res = await fetch(this.healthURL)
            const contentType = res.headers.get("content-type") || "";
            let infoString = "";

            if (contentType.includes("application/json")) {
                const data = await res.json();
                infoString = JSON.stringify(data);
            } else {
                const textData = await res.text();
                infoString = textData.trim() || res.statusText;
            }

            return new Status(`${res.status}`, infoString);
            

        } catch (error: any) {
            console.error(error)
            return new Status("ERR", `${error.message}`)
        }
    }
}

class Status {
    code: string
    info: string

    constructor(code: string, info: string){
        this.code = code
        this.info = info
    }
}

var servers: Array<Server> = [];

(function setupServers() {
    // rasp Server
    let rasp = new Server("rasp");
    rasp.addService(
        new Service(
            "mentorship-helper", 
            "https://mentorship.actiol.dev/health"
        )
    )
    rasp.addService(
        new Service(
            "honig-bot"
        )
    )
    rasp.addService(
        new Service(
            "audio-bot"
        )
    )
    rasp.addService(
        new Service(
            "zipline", 
            "https://i.actiol.dev/api/healthcheck"
        )
    )
    rasp.addService(
        new Service(
            "fileserver quantum", 
            "https://fs.actiol.dev/health"
        )
    )

    servers.push(rasp)
})();


(function injectServers() {
    const listing = document.getElementById("server-listing")
    servers.forEach(async (server) => {
        
        const serverPanel = document.createElement('div')

        

        const statusPairs: [Service, Status | null][] = await Promise.all(
            server.services.map(async s => [s, await s.healthCheck()])
        );

        const mostCommonCode: string = statusPairs
            .map(([_, status]) => status?.code)
            .filter((code): code is string => !!code)
            .reduce<string | undefined>((acc, code, _, arr) => {
                const count = (c: string) => arr.filter(x => x === c).length;
                return acc === undefined || count(code) > count(acc) ? code : acc;
            }, undefined) ?? "???";

        serverPanel.innerHTML = `<h1 class="server-name">🛢️ ${server.name} <span class="status-modal status-modal--${mostCommonCode}" data-tooltip="Overall Server Status">${mostCommonCode}</span></h1>`

        for (let [service, status] of statusPairs) {
            if (status === null) {
                if (mostCommonCode === '???') {
                    status = new Status(mostCommonCode, "Failed to infer status")
                } else {
                    status = new Status(mostCommonCode, "Infered status based on other services")
                }
            }

            const safeInfo = status.info.replace(/"/g, '&quot;');
            serverPanel.innerHTML += `
                    <span class="service">
                        <span class="status-modal status-modal--${status.code}" data-tooltip="${safeInfo}">${status.code}</span> ${service.name}
                    </span>
                `
            }

            serverPanel.innerHTML = '<div class="server">' + serverPanel.innerHTML + '</div>'

        listing?.appendChild(serverPanel)
    })
})();