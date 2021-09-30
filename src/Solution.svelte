<script>
  import Heading from './Heading.svelte'
  let days = 2
  let lang = "Svelte"
  export let em
  let mark = ""
  export let text = "";
  let colored = false;
  $: name = text;

  let char = "!"

  if (em == null || em == "" || em == false) {
    mark = ""
  } else if (em == "!" || em == true) {
    mark = "!"
  }

  $: if (text.includes(char)) {
    colored = true;
  } else {
    colored = false;
  }
</script>

<Heading {name} />

<h1>I want to learn <span class={colored === false ? '' : 'colored'}>{lang}</span> in {days} days{mark}</h1>

Input what to learn:<input type="text" bind:value={lang} />
<br />
Input days to learn: <input type="text" bind:value={days} />

<h1>{text}</h1>

<input type="text" bind:value={text} />


<style>
    .colored {
        color: orangered;
    }
</style>
