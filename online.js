// --- 1. CONFIGURATION & STATE ---
const CONFIG = {
    FILE_PATH: "/sdcard/Movies/media.temp",
    ICON_URL: "https://i.ibb.co.com/ZRhP2mLQ/89cc46724d5ce9de493de87b083102fd-removebg-preview.png",
    TIMEOUT: 10000,
    VIP_API_URL: "https://nathan-panel.koyeb.app/api/users/public"
};

let ModState = {
    isVIP: false,
    userId: '',
    statusText: 'Free Member 👤',
    daysRemaining: 0,
    menuInstance: null,
    switches: {
        normal: false,
        sshOnly: false,
        notesOnly: false,
        bypassExpired: false,
        removeAds: true
    },
    hookState: {
        normal: {
            hooked: false,
            originalL: null
        },
        bypassExpired: {
            hooked: false,
            originalCurrentTimeMillis: null 
        },
        removeAds: {
            hooked: false,
            originalMethods: {} 
        }
    }
};

// --- 2. SERVICES (IO & NETWORK) ---
const Service = {
    getPersistentId: function() {
        let id = "N-NEED-PERMISSION";
        Java.perform(() => {
            try {
                const File = Java.use('java.io.File');
                const file = File.$new(CONFIG.FILE_PATH);
                if (file.exists()) {
                    const fis = Java.use('java.io.FileInputStream').$new(file);
                    const reader = Java.use('java.io.BufferedReader').$new(Java.use('java.io.InputStreamReader').$new(fis));
                    id = reader.readLine();
                    reader.close();
                } else {
                    id = "N-" + Math.random().toString(36).substring(2, 8).toUpperCase();
                    const fos = Java.use('java.io.FileOutputStream').$new(file);
                    fos.write(Java.use('java.lang.String').$new(id).getBytes());
                    fos.close();
                }
            } catch (e) { console.error("Storage Error: " + e); }
        });
        return id;
    },

    fetchData: function(url) {
        let content = "";
        Java.perform(() => {
            try {
                const URL = Java.use('java.net.URL').$new(url);
                const conn = Java.cast(URL.openConnection(), Java.use('java.net.HttpURLConnection'));
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(CONFIG.TIMEOUT);
                conn.setReadTimeout(CONFIG.TIMEOUT);
                const reader = Java.use('java.io.BufferedReader').$new(Java.use('java.io.InputStreamReader').$new(conn.getInputStream()));
                let line;
                while ((line = reader.readLine()) !== null) { content += line.trim() + "\n"; }
                reader.close();
                conn.disconnect();
            } catch (e) { content = "ERROR_NET"; }
        });
        return content;
    },

    // Fungsi untuk cek VIP dari API
    checkVIPFromAPI: function() {
        try {
            const apiUrl = CONFIG.VIP_API_URL;
            const response = this.fetchData(apiUrl);
            
            if (response === "ERROR_NET") {
                console.error("[VIP CHECK] Network error");
                return false;
            }
            
            const data = JSON.parse(response);
            if (data.ok && data.users) {
                const user = data.users.find(u => u.username === ModState.userId.trim());
                if (user && user.status === "active") {
                    ModState.isVIP = true;
                    ModState.daysRemaining = user.days_remaining || 0;
                    ModState.statusText = `VIP Member 💎 (${user.days_remaining} days remaining)`;
                    return true;
                }
            }
        } catch (e) {
            console.error("[VIP CHECK] Error: " + e);
        }
        
        ModState.isVIP = false;
        ModState.daysRemaining = 0;
        ModState.statusText = 'Free Member 👤';
        return false;
    }
};

// --- 3. HANDLER (FUNGSI UNIVERSAL + EXPIRED BYPASS) ---
const Handler = {
    
    handleRemoveAdsSwitch: function(isOn) {
        if (isOn && !ModState.hookState.removeAds.hooked) {
            Java.perform(function() {
                try {
                    // Simpan method original sebelum di-hook
                    var originalMethods = {};
                    
                    // 1. Hook Activity.startActivity
                    var Activity = Java.use("android.app.Activity");
                    originalMethods.activityStartActivity = Activity.startActivity.overload('android.content.Intent').implementation;
                    
                    Activity.startActivity.overload('android.content.Intent').implementation = function(intent) {
                        try {
                            var target = "com.google.android.gms.ads.AdActivity";
                            if (intent.getComponent() && intent.getComponent().getClassName() === target) {
                                return;
                            }
                        } catch(e) { }
                        return this.startActivity(intent);
                    };

                    // 2. Hook AdView.loadAd
                    try {
                        var AdView = Java.use("com.google.android.gms.ads.AdView");
                        originalMethods.adViewLoadAd = AdView.loadAd.implementation;
                        
                        AdView.loadAd.implementation = function(adRequest) {
                            // Block ads silently
                            return;
                        };
                    } catch(e) { }

                    // 3. Hook InterstitialAd.load
                    try {
                        var InterstitialAd = Java.use("com.google.android.gms.ads.interstitial.InterstitialAd");
                        originalMethods.interstitialAdLoad = InterstitialAd.load.overload('android.content.Context', 'com.google.android.gms.ads.AdRequest').implementation;
                        
                        InterstitialAd.load.overload('android.content.Context', 'com.google.android.gms.ads.AdRequest').implementation = function(ctx, adRequest) {
                            // Block ads silently
                            return;
                        };
                    } catch(e) { }
                    
                    // 4. Hook RewardedAd.load
                    try {
                        var RewardedAd = Java.use("com.google.android.gms.ads.rewarded.RewardedAd");
                        originalMethods.rewardedAdLoad = RewardedAd.load.overload('android.content.Context', 'com.google.android.gms.ads.AdRequest', 'com.google.android.gms.ads.rewarded.RewardedAdLoadCallback').implementation;
                        
                        RewardedAd.load.overload('android.content.Context', 'com.google.android.gms.ads.AdRequest', 'com.google.android.gms.ads.rewarded.RewardedAdLoadCallback').implementation = function(ctx, adRequest, callback) {
                            // Block ads silently
                            return;
                        };
                    } catch(e) { }
                    
                    ModState.hookState.removeAds.originalMethods = originalMethods;
                    ModState.hookState.removeAds.hooked = true;
                    
                    console.log("[REMOVE ADS] ✅ Ads blocked successfully");
                    
                } catch (e) { 
                    console.error("[REMOVE ADS] ❌ Failed to block ads: " + e);
                    ModState.hookState.removeAds.hooked = false;
                }
            });
        } else if (!isOn && ModState.hookState.removeAds.hooked) {
            Java.perform(function() {
                try {
                    var originalMethods = ModState.hookState.removeAds.originalMethods;
                    
                    // 1. Restore Activity.startActivity
                    if (originalMethods.activityStartActivity) {
                        var Activity = Java.use("android.app.Activity");
                        Activity.startActivity.overload('android.content.Intent').implementation = originalMethods.activityStartActivity;
                    }

                    // 2. Restore AdView.loadAd
                    if (originalMethods.adViewLoadAd) {
                        try {
                            var AdView = Java.use("com.google.android.gms.ads.AdView");
                            AdView.loadAd.implementation = originalMethods.adViewLoadAd;
                        } catch(e) { }
                    }

                    // 3. Restore InterstitialAd.load
                    if (originalMethods.interstitialAdLoad) {
                        try {
                            var InterstitialAd = Java.use("com.google.android.gms.ads.interstitial.InterstitialAd");
                            InterstitialAd.load.overload('android.content.Context', 'com.google.android.gms.ads.AdRequest').implementation = originalMethods.interstitialAdLoad;
                        } catch(e) { }
                    }
                    
                    // 4. Restore RewardedAd.load
                    if (originalMethods.rewardedAdLoad) {
                        try {
                            var RewardedAd = Java.use("com.google.android.gms.ads.rewarded.RewardedAd");
                            RewardedAd.load.overload('android.content.Context', 'com.google.android.gms.ads.AdRequest', 'com.google.android.gms.ads.rewarded.RewardedAdLoadCallback').implementation = originalMethods.rewardedAdLoad;
                        } catch(e) { }
                    }
                    
                    ModState.hookState.removeAds.hooked = false;
                    ModState.hookState.removeAds.originalMethods = {};
                    
                    console.log("[REMOVE ADS] ✅ Ads restored successfully");
                    
                } catch (e) {
                    console.error("[REMOVE ADS] ❌ Failed to restore ads: " + e);
                }
            });
        }
        
        // Update state switch
        ModState.switches.removeAds = isOn;
    },
    
    // ========== FUNGSI BYPASS EXPIRED VPN ==========
    handleBypassExpiredSwitch: function(isOn) {
        if (isOn && !ModState.hookState.bypassExpired.hooked) {
            Java.perform(function() {
                try {
                    var DATE_STRING = '2010-10-10'; // Tanggal tetap atau bisa dikonfigurasi
                    
                    // konversi DATE_STRING ke epoch ms (UTC)
                    function parseToMillis(s) {
                        // YYYY-MM-DD
                        var reDateOnly = /^\s*(\d{4})-(\d{2})-(\d{2})\s*$/;
                        var m = s.match(reDateOnly);
                        if (m) {
                            var y = parseInt(m[1], 10);
                            var mo = parseInt(m[2], 10) - 1; // monthIndex
                            var d = parseInt(m[3], 10);
                            return Date.UTC(y, mo, d, 0, 0, 0); // midnight UTC
                        }
                        // ISO-like full datetime (try Date.parse)
                        var parsed = Date.parse(s);
                        if (!isNaN(parsed)) return parsed;
                        // fallback: now
                        return Date.now();
                    }

                    var FIXED_MS = parseToMillis(DATE_STRING);

                    var System = Java.use('java.lang.System');
                    
                    // Simpan implementasi asli sebelum mengganti
                    var originalCurrentTimeMillis = System.currentTimeMillis;
                    ModState.hookState.bypassExpired.originalCurrentTimeMillis = originalCurrentTimeMillis;
                    
                    // Ganti implementasi dengan tanggal tetap
                    System.currentTimeMillis.implementation = function () {
                        return FIXED_MS;
                    };
                    
                    ModState.hookState.bypassExpired.hooked = true;
                    
                    try {
                        alert('Expired Bypassed Supported\n\n• HTTP CUSTOM\n• SSH CUSTOM');
                        toast('Expiration Removed ✅ By Nathan');
                    } catch (e) {}
                    
                    console.log("[BYPASS EXPIRED] ✅ Active");
                    
                } catch (e) { 
                    ModState.hookState.bypassExpired.hooked = false;
                }
            });
        } else if (!isOn && ModState.hookState.bypassExpired.hooked) {
            Java.perform(function() {
                try {
                    var System = Java.use('java.lang.System');
                    
                    // Kembalikan ke implementasi asli
                    if (ModState.hookState.bypassExpired.originalCurrentTimeMillis) {
                        System.currentTimeMillis.implementation = ModState.hookState.bypassExpired.originalCurrentTimeMillis;
                    } else {
                        System.currentTimeMillis.implementation = undefined;
                    }
                    
                    ModState.hookState.bypassExpired.hooked = false;
                    ModState.hookState.bypassExpired.originalCurrentTimeMillis = null;
                    
                    console.log("[BYPASS EXPIRED] ❌ Deactived ");
                    
                } catch (e) {
                }
            });
        }
        
        // Update state switch
        ModState.switches.bypassExpired = isOn;
    },

    // ========== FUNGSI UNIVERSAL ==========
    decryptConfigUniversal: function() {
        Java.perform(function() {
            
            function isValueEmpty(value) {
                if (!value || value.trim() === '""' || value.trim() === 'Undefined') {
                    return true;
                }
                if (value.trim() === "88a05e8772eac3e5703e0cd26c6e6f23de72fb09f7ee5a43283d1681f19d88a05e8772eac3e5703e0cd26c6e6f23de72fb09f7ee5a43283d1681f19d") {
                    return true;
                }
                if (value.trim() === ":") {
                    return true;
                }
                return false;
            }
            
            function decrypt_ssh(ssh) {
                if (!ssh) return ssh;

                function decryptor(text) {
                    if (!text || typeof text !== 'string' || !text.includes('.')) return text;
                    try {
                        const lst = text.split('.');
                        if (lst.length % 2 !== 0) return text; 
                        
                        const data = lst.filter((_, idx) => idx % 2 === 0).map(Number);
                        const nums = lst.filter((_, idx) => idx % 2 !== 0).map(Number);

                        if (data.length !== nums.length) return text;

                        const decrypted_data = data.map((d, idx) => String.fromCharCode((d - data.length) >> (nums[idx] - data.length) & 255)).join('');
                        return decrypted_data.replace(/[^\x20-\x7E]/g, "").trim();
                    } catch(e) {
                         return text;
                    }
                }

                const ssh_encrypted = ssh.match(/([\S]+?):(\S+?)@([\-\d]+)\.(\d+)/);
                if (ssh_encrypted) {
                    const parts = ssh.split("@");
                    if (parts.length === 2) {
                        const [host_port, credentials] = parts;
                        const [username, password] = credentials.split(":");
                        if (username && password) {
                            return `${host_port}@${decryptor(username)}:${decryptor(password)}`;
                        }
                    }
                }
                return ssh;
            }

            function decrypt_auth(auth) {
                if (!auth) return auth;

                function decryptor(text) {
                     if (!text || typeof text !== 'string' || !text.includes('.')) return text;
                     try {
                        const lst = text.split('.');
                        if (lst.length % 2 !== 0) return text;
                        
                        const data = lst.filter((_, idx) => idx % 2 === 0).map(Number);
                        const nums = lst.filter((_, idx) => idx % 2 !== 0).map(Number);

                        if (data.length !== nums.length) return text;

                        const decrypted_data = data.map((d, idx) => String.fromCharCode((d - data.length) >> (nums[idx] - data.length) & 255)).join('');
                        return decrypted_data.replace(/[^\x20-\x7E]/g, "").trim();
                     } catch(e) {
                         return text;
                     }
                }

                const auth_encrypted = auth.match(/(\S+?):(\S+?)\.(\d+)/);
                if (auth_encrypted) {
                    const parts = auth.split(":");
                    if (parts.length === 2) {
                        const [id, token] = parts;
                        return `${decryptor(id)}:${decryptor(token)}`;
                    }
                }
                return auth;
            }

            var Z3A_Class;
            var Z3A_Instance;
            
            try {
                Z3A_Class = Java.use("z3.a"); 
                Z3A_Instance = Z3A_Class.$new();
            } catch (e) {
            }

            var Config = Java.use("team.dev.epro.apkcustom.MainActivity");
            
            if (ModState.hookState.normal.hooked) {
                return;
            }
            
            if (!ModState.switches.normal && !ModState.switches.sshOnly && !ModState.switches.notesOnly) {
                return;
            }

            try {
                var originalMethod = Config.L;
                ModState.hookState.normal.originalL = originalMethod;
            } catch (e) {
                ModState.hookState.normal.originalL = null;
            }
            
            var lastReturnValue = null;

            Config.L.implementation = function(a) {
                if (!ModState.switches.normal && !ModState.switches.sshOnly && !ModState.switches.notesOnly) {
                    try {
                        if (ModState.hookState.normal.originalL) {
                            return ModState.hookState.normal.originalL.call(this, a);
                        } else {
                            return Config.L.call(this, a);
                        }
                    } catch (e) {
                        return null;
                    }
                }

                var retval;
                try {
                    if (ModState.hookState.normal.originalL) {
                        retval = ModState.hookState.normal.originalL.call(this, a);
                    } else {
                        retval = this.L(a);
                    }
                } catch (e) {
                    return null;
                }
                
                var currentReturnValue = JSON.stringify(retval);

                if (currentReturnValue !== lastReturnValue) {
                    
                    var ssh = JSON.stringify(retval[7]).replace(/"/g, '');
                    var processed_ssh = ssh;
                    
                    if (ssh && typeof ssh === 'string' && ssh.match(/[\u2800-\u28FF]/)) {
                        if (Z3A_Instance) {
                            try {
                                processed_ssh = Z3A_Instance.u(ssh); 
                            } catch (e) {
                            }
                        } else {
                        }
                    }
                    
                    var payload = JSON.stringify(retval[0]).replace(/"/g, '');
                    var proxy = JSON.stringify(retval[1]).replace(/"/g, '');
                    var exp = JSON.stringify(retval[4]).replace(/"/g, '');
                    var notes = JSON.stringify(retval[6]).replace(/"/g, '').replace(/\\n/g, '\n');
                    var cert = JSON.stringify(retval[10]).replace(/"/g, '').replace(/\\n/g, '\n');
                    var auth = JSON.stringify(retval[11]).replace(/"/g, '');
                    var sni = JSON.stringify(retval[12]).replace(/"/g, '');
                    var serverentry = JSON.stringify(retval[24]).replace(/"/g, '');
                    var rawV2rayString = JSON.stringify(retval[26]);
                    var ns = JSON.stringify(retval[29]).replace(/"/g, '');
                    var pubkey = JSON.stringify(retval[30]).replace(/"/g, '');
                    var dns = JSON.stringify(retval[31]).replace(/"/g, '');
                    
                    var decrypted_ssh = decrypt_ssh(processed_ssh);
                    var decrypted_auth = decrypt_auth(auth);

                    var cleanV2ray = rawV2rayString
                                        .replace(/^"|"$/g, '')
                                        .replace(/\\t/g, '')
                                        .replace(/\\n/g, '')
                                        .replace(/\\"/g, '"');
                    
                    var v2ray = 'Undefined';
                    try {
                        var v2rayObject = JSON.parse(cleanV2ray);
                        v2ray = JSON.stringify(v2rayObject, null, 2); 
                    } catch (e) {
                        if (cleanV2ray.trim() !== '') {
                             v2ray = cleanV2ray;
                        }
                    }

                    var logContent = "HC - Decryptor @Nathanaeru ";
                    logContent += "\n\n";
                    
                    const isNormalMode = ModState.switches.normal;
                    const isSshOnlyMode = ModState.switches.sshOnly;
                    const isNotesOnlyMode = ModState.switches.notesOnly;
                    
                    if (isNormalMode) {
                        if (!isValueEmpty(payload)) logContent += "☃️ Payload : `" + payload + "`\n";
                        if (!isValueEmpty(proxy)) logContent += "❄️ Proxy : `" + proxy + "`\n";
                        if (!isValueEmpty(exp)) logContent += "⏳ Expired Date : `" + exp + "`\n";
                        if (!isValueEmpty(decrypted_ssh)) logContent += "🐧 SSH : `" + decrypted_ssh + "`\n";
                        if (!isValueEmpty(sni)) logContent += "🧊 SNI : `" + sni + "`\n";
                        
                        if (!isValueEmpty(serverentry)) logContent += "🎄 PsiphonAuthorization : `" + serverentry + "`\n";

                        if (!isValueEmpty(v2ray) && v2ray !== 'Undefined') logContent += "🎄 V2rayJson : `" + v2ray + "`\n"; 

                        if (!isValueEmpty(ns)) logContent += "🎄 SlowDNS Server : `" + ns + "`\n";
                        if (!isValueEmpty(pubkey)) logContent += "🎄 SlowDNS Pubkey : `" + pubkey + "`\n";
                        if (!isValueEmpty(dns)) logContent += "🎄 SlowDNS Domain : `" + dns + "`\n";

                        if (!isValueEmpty(cert)) logContent += "🧊 OvpnCert : `" + cert + "`\n";
                        if (!isValueEmpty(decrypted_auth)) logContent += "🐧 OvpnAuth : `" + decrypted_auth + "`\n";
                        
                    } else if (isSshOnlyMode) {
                        if (!isValueEmpty(decrypted_ssh)) {
                             logContent += "🐧 SSH : `" + decrypted_ssh + "`\n";
                        } else {
                             logContent += "🐧 SSH : `Failed To Decrypt`\n";
                        }
                    } else if (isNotesOnlyMode) {
                        if (!isValueEmpty(notes)) {
                            let formattedNotes = notes;
                            formattedNotes = formattedNotes.replace(/\\n{2,}/g, '\n\n');
                            formattedNotes = formattedNotes.trim();
                            
                            if (formattedNotes) {
                                logContent += "📝 Notes :\n";
                                logContent += "```\n" + formattedNotes + "\n```\n";
                            } else {
                                logContent += "📝 Notes : `No notes available`\n";
                            }
                        } else {
                            logContent += "📝 Notes : `No notes available`\n";
                        }
                    } else {
                        logContent += "Status: `[Inactive/Error in Logic Check]`\n";
                    }

                    logContent += "\n";

                    try {
                        const FileOutputStream = Java.use('java.io.FileOutputStream');
                        const OutputStreamWriter = Java.use('java.io.OutputStreamWriter');
                        const File = Java.use("java.io.File");
                        const filePath = "/sdcard/Nathan-HC-Config.txt";
                        const file = File.$new(filePath);

                        if (file.exists()) {
                            file.delete();
                        }

                        const file2 = FileOutputStream.$new(filePath, false);
                        const writer2 = OutputStreamWriter.$new(file2);
                        const text = logContent + "\n";
                        writer2.write.overload('java.lang.String', 'int', 'int').call(writer2, text, 0, text.length);
                        writer2.close();

                    } catch (e) {
                    }

                    alert('' + logContent + '');
                    device.setClipboard(logContent);             

                    lastReturnValue = currentReturnValue;
                }

                return retval;
            };
            
            ModState.hookState.normal.hooked = true;
        });
    },

    // ========== HANDLER UNTUK SWITCH ==========
    handleNormalSwitch: function(isOn) {
        if (isOn) {
            ModState.switches.sshOnly = false;
            ModState.switches.notesOnly = false;
        }
        
        ModState.switches.normal = isOn;
        
        if (ModState.menuInstance) {
            try {
                ModState.menuInstance.find('sw_normal').val = isOn;
                ModState.menuInstance.find('sw_sshOnly').val = false;
                ModState.menuInstance.find('sw_notesOnly').val = false;
            } catch (e) {
            }
        }
        
        if (ModState.switches.normal || ModState.switches.sshOnly || ModState.switches.notesOnly) {
            this.decryptConfigUniversal();
        } else {
            this.disableUniversalHook();
        }
    },

    handleSshOnlySwitch: function(isOn) {
        if (isOn) {
            ModState.switches.normal = false;
            ModState.switches.notesOnly = false;
        }
        
        ModState.switches.sshOnly = isOn;
        
        if (ModState.menuInstance) {
            try {
                ModState.menuInstance.find('sw_sshOnly').val = isOn;
                ModState.menuInstance.find('sw_normal').val = false;
                ModState.menuInstance.find('sw_notesOnly').val = false;
            } catch (e) {
            }
        }
        
        if (ModState.switches.normal || ModState.switches.sshOnly || ModState.switches.notesOnly) {
            this.decryptConfigUniversal();
        } else {
            this.disableUniversalHook();
        }
    },

    handleNotesOnlySwitch: function(isOn) {
        if (isOn) {
            ModState.switches.normal = false;
            ModState.switches.sshOnly = false;
        }
        
        ModState.switches.notesOnly = isOn;
        
        if (ModState.menuInstance) {
            try {
                ModState.menuInstance.find('sw_notesOnly').val = isOn;
                ModState.menuInstance.find('sw_normal').val = false;
                ModState.menuInstance.find('sw_sshOnly').val = false;
            } catch (e) {
            }
        }
        
        if (ModState.switches.normal || ModState.switches.sshOnly || ModState.switches.notesOnly) {
            this.decryptConfigUniversal();
        } else {
            this.disableUniversalHook();
        }
    },

    disableUniversalHook: function() {
        if (ModState.switches.normal || ModState.switches.sshOnly || ModState.switches.notesOnly) {
            return;
        }
        
        Java.perform(function() {
            try {
                const Config = Java.use("team.dev.epro.apkcustom.MainActivity");
                
                if (ModState.hookState.normal.originalL) {
                    if (typeof ModState.hookState.normal.originalL === 'function') {
                        Config.L.implementation = ModState.hookState.normal.originalL;
                    } else {
                        Config.L.implementation = undefined;
                    }
                    ModState.hookState.normal.originalL = null;
                } else {
                    Config.L.implementation = undefined;
                }
                
                ModState.hookState.normal.hooked = false;
                
            } catch (e) {
                ModState.hookState.normal.hooked = false;
                ModState.hookState.normal.originalL = null;
            }
        });
    }
};

// --- 4. UI RENDERER & LOGIC ---
const Actions = {
    copyId: function() { 
        device.setClipboard(ModState.userId); 
        alert('User ID : ' + ModState.userId + '\n\nSuccessfully copied to clipboard'); 
    }
};

const App = {
    render: function() {
        if (ModState.menuInstance) { 
            try { ModState.menuInstance.close(); } catch (e) {} 
        }
        
        let statusColor = '#00FF00';
        if (ModState.isVIP) {
            statusColor = '#FFD700';
        }
        
        const infoItems = [
            {'type': 'category', 'title': '👤 Information'},
            { type: 'text', val: '🔑 User ID : ' + ModState.userId },
            { type: 'text', val: '👁️‍🗨️ Status :', color: '#FFFFFF' },
            { 
                type: 'text', 
                val: ModState.statusText,
                color: statusColor
            },
            {'type': 'collapse', 'title': 'Tutorial VIP', 'item': [
            {
                'type': 'text',
                val: 'Want to be VIP?'
            },
            {
                'type': 'text',
                val: 'Copy Your User ID & chat @Nathanaeru'
            },
            {
                'type': 'text',
                val: 'Finish your Payment & Wait Activated from Nathan'
            }
        ],
        'default': true
    },
            {'type': 'category', 'title': 'User Actions'},
            { type: 'button', title: 'Copy User ID', id: 'btn_copy' }
        ];

        // Tab Free (Fitur Universal)
        const freeItems = [
            {'type': 'category', 'title': '⭐ Decrypt Menu'},
            { 
                type: 'switch', 
                title: 'Decrypt Config HC Normal', 
                val: ModState.switches.normal, 
                id: 'sw_normal',
                description: 'Mode Normal: Menampilkan semua config (Payload, SSH, SNI, dll)'
            },
            { 
                type: 'switch', 
                title: 'Decrypt Config HC (UDP Only)', 
                val: ModState.switches.sshOnly, 
                id: 'sw_sshOnly',
                description: 'Mode SSH Only: Hanya menampilkan SSH'
            },
            { 
                type: 'switch', 
                title: 'Decrypt Config HC (Notes Only)', 
                val: ModState.switches.notesOnly, 
                id: 'sw_notesOnly',
                description: 'Mode Notes Only: Hanya menampilkan Notes/Informasi tambahan'
            },
            {'type': 'collapse', 'title': 'How To Use ❓', 'item': [
            {
                'type': 'text',
                val: 'Don`t Greedy active all feature because it`s cause lag to your device 🤡'
            }
        ],
        'default': true
    }
        ];

        // Tab Misc (untuk semua user)
        const miscItems = [
            {'type': 'category', 'title': '🔎 Special Menu'},
            { 
                type: 'switch', 
                title: 'Remove Ads All VPN', 
                val: ModState.switches.removeAds, 
                id: 'sw_remove_ads',
                description: 'Menghapus iklan Google Ads dari aplikasi (Default: ON)'
            },
            { 
                type: 'switch', 
                title: 'Bypass Expired All VPN', 
                val: ModState.switches.bypassExpired, 
                id: 'sw_bypass_expired',
                description: 'Mengganti tanggal sistem menjadi 2010-10-10 untuk melewati expired All VPN'
            },
            {'type': 'collapse', 'title': '📝 Notes', 'item': [
            {
                'type': 'text',
                val: 'Remove Ads it`s auto on but you can turn off but why? if you wanna support Dev VPN by click their Ads 🥰'
            },
            {
                'type': 'text',
                val: 'Hwid Spoofer Coming Soon 📢'
            }
        ],
        'default': true
    }
        ];

        // Tab VIP - Hanya informasi, tidak ada fitur VIP
        const vipItems = [
            { type: 'text', val: '⚠️ VIP Features Temporarily Disabled', color: '#FF0000' },
            { type: 'text', val: 'VIP features are currently under maintenance.' },
            { type: 'text', val: 'Please check back later or contact @Nathanaeru for updates.' },
            {'type': 'image', 'width': 300, 'height': 300, 
             'val': 'https://i.ibb.co.com/ZRhP2mLQ/89cc46724d5ce9de493de87b083102fd-removebg-preview.png'}
        ];
        
        ModState.menuInstance = modmenu.create('Nathan - Tools', [
            { 
                type: 'tab', 
                id: 'main_tabs', 
                item: [
                    { title: '👤 Info', item: infoItems },
                    { title: '🌐 Free', item: freeItems },
                    { title: '⚙️ Misc', item: miscItems },
                    { title: '💎 VIP', item: vipItems }
                ]
            }
        ], {
            onchange: (result) => {
                switch (result.id) {
                    case 'btn_copy': 
                        Actions.copyId(); 
                        break;
                    case 'sw_normal': 
                        Handler.handleNormalSwitch(result.val); 
                        break;
                    case 'sw_sshOnly': 
                        Handler.handleSshOnlySwitch(result.val); 
                        break;
                    case 'sw_notesOnly': 
                        Handler.handleNotesOnlySwitch(result.val);
                        break;
                    case 'sw_bypass_expired': 
                        Handler.handleBypassExpiredSwitch(result.val); 
                        break;
                    case 'sw_remove_ads': 
                        Handler.handleRemoveAdsSwitch(result.val); 
                        break;
                    case 'comingsoon': 
                        alert("Coming Soon"); 
                        break;
                }
            }
        });

        const menu = ModState.menuInstance;
        menu.icon(CONFIG.ICON_URL);
        menu.size(500, 650);
        menu.position(5, 0, 0);
        menu.edgeHiden(true);
        menu.state();
    },
    
    init: function() { 
        ModState.userId = Service.getPersistentId(); 
        
        // Cek VIP status dari API
        Service.checkVIPFromAPI();
        
        // Aktifkan Remove Ads secara default saat inisialisasi
        if (ModState.switches.removeAds) {
            Handler.handleRemoveAdsSwitch(true);
        }
        
        this.render(); 
    }
};

App.init();
