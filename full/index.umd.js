!function(e,r){"object"==typeof exports&&"undefined"!=typeof module?r(exports):"function"==typeof define&&define.amd?define(["exports"],r):r((e="undefined"!=typeof globalThis?globalThis:e||self).uqry={})}(this,(function(e){const r=(e,t)=>{if(e===t)return!0;if(null==e||null==t||typeof e!=typeof t)return!1;if("object"==typeof e){if(e.map!==t.map)return!1;const n=Object.keys(e),s=Object.keys(t);return n.length===s.length&&n.every((n=>r(e[n],t[n])))}return!1},t=e=>"object"==typeof e&&!Array.isArray(e),n=e=>"string"==typeof e&&e.startsWith("$"),s=(e,r)=>(Array.isArray(r)?r:r.split(".")).reduce(((e,r)=>e?e[r]:e),e),i=(e,r,t)=>{const[n,...s]=r.map?r:r.split(".");return 0===s.length?e.map?[...e.slice(0,n),t,...e.slice(Number(n)+1)]:{...e,[n]:t}:e.map?[...e.slice(0,n),i(e[n]||{},s,t),...e.slice(Number(n)+1)]:{...e,[n]:i(e[n]||{},s,t)}},l={$eq:(e,t)=>r(e,t),$ne:(e,t)=>!r(e,t),$gt:(e,r)=>r>e,$gte:(e,r)=>r>=e,$lt:(e,r)=>r<e,$lte:(e,r)=>r<=e,$in:(e,t)=>(Array.isArray(e)?e:[e]).some((e=>r(e,t))),$nin:(e,t)=>!(Array.isArray(e)?e:[e]).some((e=>r(e,t))),$and:(e,r)=>e.every((e=>o(e)(r))),$or:(e,r)=>e.some((e=>o(e)(r))),$not:(e,r)=>!o(e)(r),$regex:(e,r)=>new RegExp(e).test(r),$expr:(e,r)=>u(e)(r),$exists:(e,r)=>void 0!==r,$type:(e,r)=>typeof r===e,$mod:(e,r)=>r%e[0]===e[1],$elemMatch:(e,r)=>(Array.isArray(r)?r:[r]).some((r=>o(e)(r))),$all:(e,r)=>Array.isArray(r)&&e.every((e=>r.some((r=>o(e)(r))))),$size:(e,r)=>!!Array.isArray(r)&&r.length===e,$where:function(e,r){return e.call(r)}},a={$add:(e,r)=>e.map((e=>u(e)(r))).reduce(((e,r)=>e+r),0),$subtract:(e,r)=>e.map((e=>u(e)(r))).reduce(((e,r)=>e-r)),$multiply:(e,r)=>e.map((e=>u(e)(r))).reduce(((e,r)=>e*r),1),$divide:(e,r)=>e.map((e=>u(e)(r))).reduce(((e,r)=>e/r)),$concat:(e,r)=>e.map((e=>u(e)(r))).join(""),$min:(e,r)=>Math.min(...e.flatMap((e=>u(e)(r)))),$max:(e,r)=>Math.max(...e.flatMap((e=>u(e)(r)))),$avg:(e,r)=>e.flatMap((e=>u(e)(r))).reduce(((e,r)=>e+r),0)/e.length,$sum:(e,r)=>e.flatMap((e=>u(e)(r))).reduce(((e,r)=>e+r),0),$cond:([e,r,t],n)=>u(e)(n)?u(r)(n):u(t)(n),$eq:([e,t],n)=>r(u(e)(n),u(t)(n)),$ne:([e,t],n)=>!r(u(e)(n),u(t)(n)),$gt:([e,r],t)=>u(e)(t)>u(r)(t),$gte:([e,r],t)=>u(e)(t)>=u(r)(t),$lt:([e,r],t)=>u(e)(t)<u(r)(t),$lte:([e,r],t)=>u(e)(t)<=u(r)(t),$in:([e,t],n)=>(Array.isArray(t)?u(t)(n):u([t])(n)).some((t=>r(u(e)(n),t))),$nin:([e,t],n)=>!(Array.isArray(t)?u(t)(n):u([t])(n)).some((t=>r(u(e)(n),t))),$and:(e,r)=>e.every((e=>u(e)(r))),$or:(e,r)=>e.some((e=>u(e)(r))),$not:(e,r)=>!u(e[0])(r),$switch:(e,r)=>{const{branches:t,default:n}=e[0];for(const e of t)if(u(e.case)(r))return u(e.then)(r);return u(n)(r)}},c={$project:(e,r)=>{const t={},n=Object.keys(e).filter((r=>0===e[r]));return n.length?Object.keys(r).forEach((e=>{n.includes(e)||(t[e]=s(r,e))})):Object.keys(e).forEach((n=>{t[n]=1!==e[n]&&0!==e[n]?u(e[n])(r):s(r,n)})),t},$match:(e,r)=>o(e)(r)?r:null,$group:({_id:e,...r},t)=>{const n=t.reduce(((t,n)=>{const s=null===e?null:u(e)(n);return t[s]||(t[s]={_id:s}),Object.entries(r).forEach((([e,r])=>{t[s][e]||(t[s][e]=[]),t[s][e].push(u(r)(n))})),t}),{});return Object.values(n).map((e=>(Object.entries(e).forEach((([t,n])=>{if("_id"!==t){const[s]=Object.entries(r[t])[0];e[t]=a[s](n,{})}})),e)))},$sort:(e,r)=>{const[t,n]=Object.entries(e)[0];return[...r].sort(((e,r)=>s(e,t)>s(r,t)?n:-n))},$skip:(e,r)=>[...r].slice(e),$limit:(e,r)=>[...r].slice(0,e),$count:(e,r)=>[{[e]:r.length}],$unwind:(e,r)=>{const t="string"==typeof e?e.slice(1):e.path.slice(1),n=e.includeArrayIndex||null,l=e.preserveNullAndEmptyArrays||!1;return r.flatMap((e=>{const r=s(e,t);return null===r?l?[{...i(e,t,null),[t]:null,...n?{[n]:null}:{}}]:[]:void 0===r||Array.isArray(r)&&0===r.length?l?[(delete e[t],{...e,...n?{[n]:null}:{}})]:[]:"string"==typeof r?[{...i(e,t,r),...n?{[n]:null}:{}}]:r.map(((r,s)=>({...i(e,t,r),...n?{[n]:s}:{}})))}))},$lookup:(e,r)=>{const{from:t,localField:n,let:i,foreignField:l,as:a,pipeline:c}=e;return r.map((e=>{let r=[];if(n&&l){const i=s(e,n);r=t.filter((e=>s(e,l)===i))}else if(c){let n,l={};Object.keys(i).forEach((r=>{l[`$$${r}`]=s(e,i[r].slice(1))})),r=$(c.map((e=>JSON.parse(JSON.stringify(e).replace(/\"\$\$\w+\"/g,(e=>(n=l[e.replace(/\"/g,"")],"string"==typeof n?`"${n}"`:n)))))))(t)}return{...e,[a]:r}}))},$addFields:(e,r)=>r.map((r=>{const t={...r};return Object.entries(e).forEach((([e,n])=>{t[e]=u(n)(r)})),t}))},o=e=>i=>t(e)?Object.entries(e).every((([e,r])=>n(e)?l[e](r,i):o(r)(s(i,e)))):r(i,e),u=e=>r=>{if(n(e))return s(r,e.slice(1));if(t(e)){const[t,n]=Object.entries(e)[0];if(a[t])return a[t](Array.isArray(n)?n:[n],r)}return e},$=e=>r=>e.reduce(((e,r)=>{const[t,n]=Object.entries(r)[0];if(c[t])return["$project","$match"].includes(t)?e.map((e=>c[t](n,e))).filter(Boolean):c[t](n,e)}),r);e.add=(e,r,t)=>{"filter"===e&&(l[r]=t),"stage"===e&&(c[r]=t),"expression"===e&&(a[r]=t)},e.aggregate=$,e.expression=u,e.filter=o,e.isEqual=r}));