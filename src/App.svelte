<script>
  import Solution from './Solution.svelte'

  let isVisible = false;

  function showSolution() {
    isVisible = true;
  }
</script>

<style>
  .visible {
    visibility: visible;
  }

  .invisible {
    display: none;
    visibility: hidden;
  }
</style>

<h1>Assignment</h1>

<p>Solve these tasks.</p>

<ol>
  <li>Add an input field that allows users to enter a course goal.</li>
  <li>Output the user input in a h1 tag.</li>
  <li>
    Color the output red (e.g. by adding a class) if it contains at least one exclamation mark.
  </li>
  <li>
    Put the h1 tag + output into a separate component to which you pass the user input
  </li>
</ol>

<button on:click={showSolution}>Solution</button>

<div class={isVisible === false ? 'invisible' : 'visible'}>
  <Solution em={true} />
</div>

