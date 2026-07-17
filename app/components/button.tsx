export default function Button(){
      return <div>
        hi there

        <p><s-button-group>
  <s-button slot="secondary-actions" icon="duplicate">Duplicate</s-button>
  <s-button slot="secondary-actions" icon="archive">Archive</s-button>
  <s-button slot="secondary-actions" icon="delete" tone="critical">
    Delete
  </s-button>
</s-button-group></p>
      </div>
}